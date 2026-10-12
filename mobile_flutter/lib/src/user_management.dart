import 'package:flutter/material.dart';
import 'search.dart';
import 'toast.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';
import 'auth.dart';

const jobTitles = ['Admin Staff', 'Maintenance Manager', 'Pilot', 'Officer-In-Charge', 'Mechanic', 'Warehouse Personnel'];
const roleAccess = {
  'Admin Staff': 'Admin Staff', 'Maintenance Manager': 'Superuser',
  'Officer-In-Charge': 'Superuser', 'Pilot': 'User',
  'Mechanic': 'User', 'Warehouse Personnel': 'User',
};

class UserManagementPage extends StatefulWidget {
  const UserManagementPage({super.key, required this.session});
  final AirmsSession session;
  @override State<UserManagementPage> createState() => _UserManagementPageState();
}
class _UserManagementPageState extends State<UserManagementPage> {
  List<Map<String, dynamic>> users = [];
  String query = '', status = 'all', role = 'all', access = 'all', error = '';
  bool loading = true;
  String get currentId => '${widget.session.user?['_id'] ?? widget.session.user?['id'] ?? ''}';

  @override void initState() { super.initState(); load(); }
  Future<void> load() async {
    setState(() => loading = true);
    try {
      final response = await widget.session.request('/api/user/get-all-users');
      if (mounted) {
        setState(() {
          users = (response['data'] as List? ?? []).whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList();
          error = '';
        });
      }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => loading = false); }
  }
  Future<bool> confirm(String title, String message) async => await showDialog<bool>(context: context,
    builder: (_) => AlertDialog(title: Text(title), content: Text(message), actions: [
      TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
      FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Confirm')),
    ])) ?? false;

  Future<void> act(Map<String, dynamic> user, String label, String path, String method, [Map<String, dynamic>? body]) async {
    if (!await confirm(label, '$label ${user['firstName'] ?? user['email'] ?? 'this user'}?')) return;
    try {
      await widget.session.request(path, method: method,
        extraHeaders: {'x-action-confirmed': 'true'},
        body: {...?body, 'confirmAction': true});
      await load();
      if (mounted) AirmsToast.show('$label successful');
    } catch (e) { if (mounted) AirmsToast.show(e); }
  }

  Future<void> edit([Map<String, dynamic>? user]) async {
    final changed = await Navigator.push<bool>(context, MaterialPageRoute(builder: (_) => UserFormPage(
      session: widget.session, users: users, currentId: currentId, user: user)));
    if (changed == true) load();
  }

  @override Widget build(BuildContext context) {
    final filtered = users.where((user) {
      if (status != 'all' && '${user['status'] ?? ''}'.toLowerCase() != status) return false;
      if (role != 'all' && '${user['jobTitle'] ?? ''}'.toLowerCase() != role.toLowerCase()) return false;
      if (access != 'all' && '${user['access'] ?? ''}'.toLowerCase() != access.toLowerCase()) return false;
      return matchesSearch(query, user);
    }).toList();
    final active = users.where((user) => user['status'] == 'active').length;
    final inactive = users.where((user) => user['status'] == 'inactive').length;
    final deactivated = users.where((user) => user['status'] == 'deactivated').length;
    return Stack(children: [RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.fromLTRB(16, 12, 16, 90), children: [
      Row(children: [for (final entry in {'Total': users.length, 'Active': active, 'Inactive': inactive, 'Deactivated': deactivated}.entries)
        Expanded(child: Card(child: Padding(padding: const EdgeInsets.all(8), child: Column(children: [
          Text('${entry.value}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          Text(entry.key, style: const TextStyle(fontSize: 10)),
        ]))))]),
      const SizedBox(height: 8),
      TextField(decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search users', border: OutlineInputBorder()),
        onChanged: (value) => setState(() => query = value)),
      const SizedBox(height: 8),
      Wrap(spacing: 8, children: [
        DropdownButton<String>(value: status, items: ['all', 'active', 'inactive', 'deactivated'].map((value) =>
          DropdownMenuItem(value: value, child: Text(value == 'all' ? 'All Statuses' : value))).toList(),
          onChanged: (value) => setState(() => status = value ?? 'all')),
        DropdownButton<String>(value: role, items: ['all', ...jobTitles].map((value) =>
          DropdownMenuItem(value: value, child: Text(value == 'all' ? 'All Roles' : value))).toList(),
          onChanged: (value) => setState(() => role = value ?? 'all')),
        DropdownButton<String>(value: access, items: ['all', 'Admin Staff', 'Superuser', 'User'].map((value) =>
          DropdownMenuItem(value: value, child: Text(value == 'all' ? 'All Access' : value))).toList(),
          onChanged: (value) => setState(() => access = value ?? 'all')),
      ]),
      if (loading) const LinearProgressIndicator(),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      for (final user in filtered) _userCard(user),
    ])),
      Positioned(right: 16, bottom: 16, child: FloatingActionButton.extended(
        onPressed: () => edit(), icon: const Icon(Icons.person_add_alt_1), label: const Text('Add User'))),
    ]);
  }

  Widget _userCard(Map<String, dynamic> user) {
    final id = '${user['_id'] ?? ''}';
    final userStatus = '${user['status'] ?? 'inactive'}'.toLowerCase();
    final inviteStatus = '${user['invitationStatus'] ?? 'pending'}'.toLowerCase();
    final isSelf = id == currentId;
    return Card(margin: const EdgeInsets.only(bottom: 12), child: Padding(padding: const EdgeInsets.all(14), child: Column(
      crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [CircleAvatar(child: Text('${user['firstName'] ?? 'U'}'[0])), const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${user['firstName'] ?? ''} ${user['lastName'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          Text('@${user['username'] ?? ''} | ${user['access'] ?? ''}', style: const TextStyle(fontSize: 12)),
        ])), Chip(label: Text(userStatus, style: const TextStyle(fontSize: 10)))]),
      const Divider(),
      Text('${user['email'] ?? ''}'), Text('${user['jobTitle'] ?? ''}'),
      if (userStatus == 'inactive') Text('Invite: $inviteStatus'),
      Wrap(spacing: 4, children: [
        IconButton(tooltip: 'Edit', onPressed: () => edit(user), icon: const Icon(Icons.edit, color: Colors.blue)),
        IconButton(tooltip: userStatus == 'active' ? 'Deactivate' : 'Reactivate',
          onPressed: isSelf ? null : () => act(user, userStatus == 'active' ? 'Deactivate' : 'Reactivate',
            '/api/user/update-user-status/$id', 'PUT', {'status': userStatus == 'active' ? 'deactivated' : 'active'}),
          icon: Icon(userStatus == 'active' ? Icons.person_remove : Icons.person_add,
            color: userStatus == 'active' ? Colors.red : Colors.green)),
        if (user['isLocked'] == true) IconButton(tooltip: 'Unlock', icon: const Icon(Icons.lock_open),
          onPressed: () => act(user, 'Unlock', '/api/user/unlock-user/$id', 'PUT')),
        if (userStatus == 'inactive' && inviteStatus != 'revoked') ...[
          IconButton(tooltip: 'Resend invite', icon: const Icon(Icons.forward_to_inbox),
            onPressed: () => act(user, 'Resend invite', '/api/user/resend-activation/$id', 'POST')),
          IconButton(tooltip: 'Extend invite 24 hours', icon: const Icon(Icons.more_time),
            onPressed: () => act(user, 'Extend invite', '/api/user/extend-invitation-expiry/$id', 'PUT', {'hours': 24})),
          IconButton(tooltip: 'Revoke invite', icon: const Icon(Icons.mail_lock, color: Colors.red),
            onPressed: () => act(user, 'Revoke invite', '/api/user/revoke-invitation/$id', 'PUT')),
        ],
      ]),
    ])));
  }
}

class UserFormPage extends StatefulWidget {
  const UserFormPage({super.key, required this.session, required this.users, required this.currentId, this.user});
  final AirmsSession session;
  final List<Map<String, dynamic>> users;
  final String currentId;
  final Map<String, dynamic>? user;
  @override State<UserFormPage> createState() => _UserFormPageState();
}
class _UserFormPageState extends State<UserFormPage> {
  final first = TextEditingController(), last = TextEditingController(), email = TextEditingController();
  final username = TextEditingController(), license = TextEditingController();
  String? jobTitle, access;
  String error = '';
  bool busy = false;
  XFile? pickedImage;
  bool get editing => widget.user != null;
  @override void initState() {
    super.initState();
    final user = widget.user ?? {};
    first.text = '${user['firstName'] ?? ''}'; last.text = '${user['lastName'] ?? ''}';
    email.text = '${user['email'] ?? ''}'; username.text = '${user['username'] ?? ''}';
    license.text = '${user['licenseNo'] ?? ''}';
    jobTitle = user['jobTitle']; access = user['access'];
    if (!editing) { first.addListener(suggestUsername); last.addListener(suggestUsername); }
  }
  void suggestUsername() {
    if (first.text.trim().isEmpty || last.text.trim().isEmpty) return;
    final base = '${last.text.trim()}${first.text.trim()[0]}'.toLowerCase().replaceAll(RegExp('[^a-z0-9]'), '');
    final taken = widget.users.map((item) => '${item['username'] ?? ''}'.toLowerCase()).toSet();
    var suggestion = base; var suffix = 2;
    while (taken.contains(suggestion)) { suggestion = '$base$suffix'; suffix++; }
    username.text = suggestion;
  }
  Future<void> pickImage(ImageSource source) async {
    try {
      final image = await ImagePicker().pickImage(source: source, imageQuality: 70, maxWidth: 300, maxHeight: 300);
      if (image != null && mounted) setState(() { pickedImage = image; error = ''; });
    } catch (e) { if (mounted) setState(() => error = '$e'); }
  }
  Future<void> submit() async {
    if (first.text.trim().isEmpty || last.text.trim().isEmpty || email.text.trim().isEmpty ||
        username.text.trim().isEmpty || jobTitle == null || access == null) {
      setState(() => error = 'Complete all required fields.'); return;
    }
    if (!RegExp(r'^\S+@\S+\.\S+$').hasMatch(email.text.trim())) {
      setState(() => error = 'Enter a valid email.'); return;
    }
    if ({'Pilot', 'Mechanic', 'Maintenance Manager', 'Officer-In-Charge'}.contains(jobTitle) &&
        !RegExp(r'^\d{6}$').hasMatch(license.text.trim())) {
      setState(() => error = 'License number must be 6 digits.'); return;
    }
    setState(() { busy = true; error = ''; });
    try {
      final path = editing ? '/api/user/update-user/${widget.user!['_id']}' : '/api/user/create';
      final fields = <String, String>{
          'firstName': first.text.trim(), 'lastName': last.text.trim(), 'email': email.text.trim(),
          'username': username.text.trim(), 'jobTitle': jobTitle!, 'access': access!,
          'licenseNo': license.text.trim(), 'confirmAction': 'true',
        };
      if (pickedImage == null) {
        await widget.session.request(path, method: editing ? 'PUT' : 'POST',
          extraHeaders: {'x-action-confirmed': 'true'}, body: fields);
      } else {
        final request = http.MultipartRequest(editing ? 'PUT' : 'POST', Uri.parse('$apiBase$path'));
        request.headers.addAll({...widget.session.headers()..remove('Content-Type'), 'x-action-confirmed': 'true'});
        request.fields.addAll(fields);
        request.files.add(await http.MultipartFile.fromPath('image', pickedImage!.path,
          filename: pickedImage!.name, contentType: MediaType('image', pickedImage!.name.toLowerCase().endsWith('.png') ? 'png' : 'jpeg')));
        final response = await http.Response.fromStream(await request.send());
        final data = decodeResponse(response);
        if (response.statusCode >= 400) throw ApiException('${data['message'] ?? 'User image upload failed'}');
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: Text(editing ? 'Edit User' : 'Add User')),
    body: ListView(padding: const EdgeInsets.all(16), children: [
      TextField(controller: first, decoration: const InputDecoration(labelText: 'First name *')),
      TextField(controller: last, decoration: const InputDecoration(labelText: 'Last name *')),
      TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email *')),
      TextField(controller: username, decoration: const InputDecoration(labelText: 'Username *')),
      Row(children: [
        OutlinedButton.icon(onPressed: busy ? null : () => pickImage(ImageSource.gallery),
          icon: const Icon(Icons.photo_library_outlined), label: Text(pickedImage == null ? 'Choose photo' : 'Change photo')),
        const SizedBox(width: 8),
        IconButton(tooltip: 'Take photo', onPressed: busy ? null : () => pickImage(ImageSource.camera),
          icon: const Icon(Icons.camera_alt_outlined)),
        if (pickedImage != null) Expanded(child: Text(pickedImage!.name, overflow: TextOverflow.ellipsis)),
      ]),
      DropdownButtonFormField<String>(initialValue: jobTitle, decoration: const InputDecoration(labelText: 'Job title *'),
        items: jobTitles.map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(),
        onChanged: (value) => setState(() { jobTitle = value; access = roleAccess[value]; })),
      DropdownButtonFormField<String>(initialValue: access, decoration: const InputDecoration(labelText: 'Access *'),
        items: ['Admin Staff', 'Superuser', 'User'].map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(),
        onChanged: (value) => setState(() => access = value)),
      if ({'Pilot', 'Mechanic', 'Maintenance Manager', 'Officer-In-Charge'}.contains(jobTitle))
        TextField(controller: license, keyboardType: TextInputType.number, maxLength: 6,
          decoration: const InputDecoration(labelText: 'License number *')),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      const SizedBox(height: 16), FilledButton(onPressed: busy ? null : submit, child: Text(editing ? 'Save changes' : 'Create user')),
    ]));
}
