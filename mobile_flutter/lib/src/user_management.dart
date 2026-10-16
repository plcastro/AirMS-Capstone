import 'dart:io';
import 'dart:ui' show ImageByteFormat;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:image/image.dart' as image;
import 'package:path_provider/path_provider.dart';
import 'search.dart';
import 'toast.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';
import 'auth.dart';
import 'date_time.dart';

const jobTitles = ['Admin Staff', 'Maintenance Manager', 'Pilot', 'Officer-In-Charge', 'Mechanic', 'Warehouse Personnel'];
const roleAccess = {
  'Admin Staff': 'Admin Staff', 'Maintenance Manager': 'Superuser',
  'Officer-In-Charge': 'Superuser', 'Pilot': 'User',
  'Mechanic': 'User', 'Warehouse Personnel': 'User',
};

String invitationDisplayStatus(Map<String, dynamic> user, {DateTime? now}) {
  final stated = '${user['invitationStatus'] ?? ''}'.toLowerCase();
  if (stated.isNotEmpty) return stated;
  if ('${user['status'] ?? ''}'.toLowerCase() == 'active') return 'claimed';
  final expiry = DateTime.tryParse('${user['invitationExpiresAt'] ?? user['tempPasswordExpires'] ?? ''}');
  if (expiry != null && expiry.isBefore(now ?? DateTime.now())) return 'expired';
  return 'pending';
}

String maskUserEmail(dynamic value) {
  final text = value == null ? '' : '$value';
  final at = text.indexOf('@');
  if (at < 0 || at == 0 || at == text.length - 1) return text;
  return '${text.substring(0, at < 2 ? at : 2)}${'*' * (at - (at < 2 ? at : 2))}${text.substring(at)}';
}

String suggestUserName(String first, String last, Iterable<Map<String, dynamic>> users, {String excludeId = ''}) {
  final given = first.trim(), family = last.trim();
  if (given.isEmpty || family.isEmpty) return '';
  final base = '$family${given[0]}'.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '');
  if (base.isEmpty) return '';
  final taken = users.where((u) => '${u['_id'] ?? ''}' != excludeId)
      .map((u) => '${u['username'] ?? ''}'.toLowerCase()).toSet();
  if (!taken.contains(base)) return base;
  var suffix = 2;
  while (taken.contains('$base$suffix')) { suffix++; }
  return '$base$suffix';
}

String? validateUserForm({required String first, required String last, required String email,
  required String username, required String? jobTitle, required String? access, required String license}) {
  if (first.trim().isEmpty || last.trim().isEmpty || email.trim().isEmpty) return 'First name, last name, and email are required.';
  if (jobTitle == null || jobTitle.isEmpty || access == null || access.isEmpty) return 'Job title and access are required.';
  if (!RegExp(r'^\S+@\S+\.\S+$').hasMatch(email.trim())) return 'Please enter a valid email.';
  if (username.trim().isEmpty) return 'Username is required.';
  if ({'pilot', 'mechanic', 'maintenance manager', 'officer-in-charge'}.contains(jobTitle.toLowerCase()) &&
      !RegExp(r'^\d{6}$').hasMatch(license.trim())) {
    return 'License number must be 6 digits.';
  }
  return null;
}

class UserManagementPage extends StatefulWidget {
  const UserManagementPage({super.key, required this.session});
  final AirmsSession session;
  @override State<UserManagementPage> createState() => _UserManagementPageState();
}
class _UserManagementPageState extends State<UserManagementPage> {
  List<Map<String, dynamic>> users = [];
  String query = '', status = 'all', role = 'all', access = 'all', error = '';
  bool loading = true;
  final Set<String> acting = {};
  String invitationEmail = '';
  Widget filterControl(String selected, List<String> options, String allLabel, ValueChanged<String> onSelect) =>
    Expanded(child: Padding(padding: const EdgeInsets.only(right: 8), child: PopupMenuButton<String>(
      onSelected: onSelect,
      itemBuilder: (_) => options.map((value) => PopupMenuItem(value: value,
        child: Text(value == 'all' ? allLabel : value, style: const TextStyle(fontSize: 12)))).toList(),
      child: Container(height: 48, padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(color: Colors.white, border: Border.all(color: const Color(0xffd0d5dd)),
          borderRadius: BorderRadius.circular(10)),
        child: Row(children: [const Icon(Icons.tune, size: 16, color: Color(0xff26866f)),
          const SizedBox(width: 6), Expanded(child: Text(selected == 'all' ? allLabel : selected,
            maxLines: 1, overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
          const Icon(Icons.keyboard_arrow_down, size: 22)])))));
  String get currentId => '${widget.session.user?['_id'] ?? widget.session.user?['id'] ?? ''}';

  @override void initState() { super.initState(); load(); }
  Future<void> load({bool silent = false}) async {
    if (!silent) setState(() => loading = true);
    try {
      final response = await widget.session.request('/api/user/get-all-users');
      if (mounted) {
        setState(() {
          users = (response['data'] as List? ?? []).whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList();
          error = '';
        });
      }
    } catch (e) { if (mounted) AirmsToast.show(e); }
    finally { if (mounted && !silent) setState(() => loading = false); }
  }
  Future<bool> confirm(String title, String message) async => await showDialog<bool>(context: context,
    builder: (_) => AlertDialog(title: Text(title), content: Text(message), actions: [
      TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
      FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Confirm')),
    ])) ?? false;

  Future<void> act(Map<String, dynamic> user, String title, String message, String success, String path, String method, [Map<String, dynamic>? body]) async {
    if (!await confirm(title, message)) return;
    final id = '${user['_id']}';
    setState(() => acting.add(id));
    try {
      await widget.session.request(path, method: method,
        extraHeaders: {'x-action-confirmed': 'true'},
        body: {...?body, 'confirmAction': true});
      await load(silent: true);
      if (mounted) AirmsToast.show(success);
    } catch (e) { if (mounted) AirmsToast.show(e); }
    finally { if (mounted) setState(() => acting.remove(id)); }
  }

  Future<void> edit([Map<String, dynamic>? user]) async {
    final result = await showDialog<Map<String, dynamic>>(context: context, barrierDismissible: false, builder: (_) => UserFormPage(
      session: widget.session, users: users, currentId: currentId, user: user));
    if (result != null) {
      await load(silent: true);
      if (mounted) AirmsToast.show(user == null ? 'User added successfully!' : 'User has been updated successfully!');
      if (user == null && mounted) {
        setState(() => invitationEmail = '${result['invitationEmail'] ?? result['email'] ?? ''}');
        if (invitationEmail.isNotEmpty) {
          await showDialog<void>(context: context, builder: (_) => AlertDialog(title: const Text('Email Sent'),
            content: Text('Activation credentials were sent to $invitationEmail.'),
            actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))]));
          if (mounted) setState(() => invitationEmail = '');
        }
      }
    }
  }

  @override Widget build(BuildContext context) {
    final filtered = users.where((user) {
      if (status != 'all' && '${user['status'] ?? ''}'.toLowerCase() != status) return false;
      if (role != 'all' && '${user['jobTitle'] ?? ''}'.toLowerCase() != role.toLowerCase()) return false;
      if (access != 'all' && '${user['access'] ?? ''}'.toLowerCase() != access.toLowerCase()) return false;
      return matchesSearch(query, user);
    }).toList();
    final active = users.where((user) => '${user['status'] ?? ''}'.toLowerCase() == 'active').length;
    final inactive = users.where((user) => '${user['status'] ?? ''}'.toLowerCase() == 'inactive').length;
    final deactivated = users.where((user) => '${user['status'] ?? ''}'.toLowerCase() == 'deactivated').length;
    final roles = {...jobTitles, ...users.map((u) => '${u['jobTitle'] ?? ''}').where((v) => v.isNotEmpty)};
    final accesses = {'Admin Staff', 'Superuser', 'User', ...users.map((u) => '${u['access'] ?? ''}').where((v) => v.isNotEmpty)};
    if (loading) return const Center(child: CircularProgressIndicator());
    return Stack(children: [RefreshIndicator(onRefresh: () => load(silent: true), child: ListView(padding: const EdgeInsets.fromLTRB(12, 12, 12, 92), children: [
      SizedBox(height: 76, child: ListView(scrollDirection: Axis.horizontal, children: [for (final entry in {'Total': users.length, 'Active': active, 'Inactive': inactive, 'Deactivated': deactivated}.entries)
        SizedBox(width: 112, child: Card(elevation: 0, color: status == (entry.key == 'Total' ? 'all' : entry.key.toLowerCase()) ? const Color(0xffe6f4f1) : Colors.white,
          child: InkWell(onTap: () => setState(() => status = entry.key == 'Total' ? 'all' : entry.key.toLowerCase()),
          child: Padding(padding: const EdgeInsets.all(8), child: Column(children: [
          Text(entry.key, style: const TextStyle(fontSize: 10)),
          Text('${entry.value}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        ])))))])),
      const SizedBox(height: 8),
      SizedBox(height: 48, child: TextField(decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search users', border: OutlineInputBorder()),
        onChanged: (value) => setState(() => query = value))),
      const SizedBox(height: 8),
      Row(children: [
        filterControl(role, ['all', ...roles], 'All Roles', (value) => setState(() => role = value)),
        filterControl(access, ['all', ...accesses], 'All Access', (value) => setState(() => access = value)),
      ]),
      if (filtered.isEmpty) const Padding(padding: EdgeInsets.all(50), child: Center(child: Text('No users matched your criteria'))),
      for (final user in filtered) _userCard(user),
    ])),
      Positioned(right: 16, bottom: 16, child: FloatingActionButton.extended(
        onPressed: () => edit(), icon: const Icon(Icons.person_add_alt_1), label: const Text('Add User'))),
    ]);
  }

  Widget _userCard(Map<String, dynamic> user) {
    final id = '${user['_id'] ?? ''}';
    final userStatus = '${user['status'] ?? 'inactive'}'.toLowerCase();
    final inviteStatus = invitationDisplayStatus(user);
    final expiry = user['invitationExpiresAt'] ?? user['tempPasswordExpires'];
    final isSelf = id == currentId;
    return Card(color: Colors.white, margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(padding: const EdgeInsets.all(15), child: Column(
      crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [CircleAvatar(
        backgroundImage: '${user['image'] ?? ''}'.isEmpty ? null : NetworkImage(
          '${user['image']}'.startsWith('http') ? '${user['image']}' : '$apiBase${'${user['image']}'.startsWith('/') ? '' : '/'}${user['image']}'),
        child: '${user['image'] ?? ''}'.isEmpty ? Text('${'${user['firstName'] ?? ''}'.isEmpty ? '' : '${user['firstName']}'[0]}${'${user['lastName'] ?? ''}'.isEmpty ? '' : '${user['lastName']}'[0]}'.toUpperCase()) : null), const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${user['firstName'] ?? ''} ${user['lastName'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          Text('@${user['username'] ?? ''} | ${user['access'] ?? ''}', style: const TextStyle(fontSize: 12)),
        ])), Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(color: userStatus == 'active' ? const Color(0xffe8f5e9) : const Color(0xffffebee),
            borderRadius: BorderRadius.circular(6)),
          child: Text(userStatus.toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold,
            color: userStatus == 'active' ? const Color(0xff2e7d32) : const Color(0xffc62828))))]),
      const Divider(),
      Row(children: [const Icon(Icons.email_outlined, size: 14), const SizedBox(width: 6), Text(maskUserEmail(user['email'] ?? ''))]),
      const SizedBox(height: 5),
      Row(children: [const Icon(Icons.work_outline, size: 14), const SizedBox(width: 6),
        Text('${user['jobTitle'] ?? 'No Title Set'}')]),
      if (userStatus == 'inactive') ...[
        Chip(backgroundColor: switch (inviteStatus) {
          'expired' => const Color(0xfffdeaea), 'revoked' => const Color(0xfff5f5f5),
          _ => const Color(0xfffff4e5)},
          label: Text('INVITE: ${inviteStatus.toUpperCase()}', style: const TextStyle(fontSize: 10))),
        Text('Expires: ${formatAirmsDateTime(expiry, fallback: 'N/A')}', style: const TextStyle(fontSize: 11)),
      ],
      Wrap(spacing: 4, children: [
        IconButton(tooltip: 'Edit', onPressed: () => edit(user), icon: const Icon(Icons.edit, color: Colors.blue)),
        IconButton(tooltip: userStatus == 'active' ? 'Deactivate' : 'Reactivate',
          onPressed: isSelf ? null : () => act(user, userStatus == 'active' ? 'Deactivate User' : 'Reactivate User',
            'Are you sure you want to ${userStatus == 'active' ? 'deactivate' : 'reactivate'} ${user['firstName'] ?? 'this user'}?',
            'User ${userStatus == 'active' ? 'deactivated' : 'reactivated'}.',
            '/api/user/update-user-status/$id', 'PUT', {'status': userStatus == 'active' ? 'deactivated' : 'active'}),
          icon: Icon(userStatus == 'active' ? Icons.person_remove : Icons.person_add,
            color: userStatus == 'active' ? Colors.red : Colors.green)),
        if (user['isLocked'] == true) IconButton(tooltip: acting.contains(id) ? 'Working...' : 'Unlock', icon: const Icon(Icons.lock_open),
          onPressed: acting.contains(id) ? null : () => act(user, 'Unlock User',
            'Unlock ${user['username'] ?? user['firstName'] ?? 'this user'}? They will be able to try logging in again.',
            'User unlocked. They can log in again.', '/api/user/unlock-user/$id', 'PUT')),
        if (userStatus == 'inactive' && ['pending', 'expired'].contains(inviteStatus)) ...[
          IconButton(tooltip: acting.contains(id) ? 'Working...' : 'Resend', icon: const Icon(Icons.forward_to_inbox),
            onPressed: acting.contains(id) ? null : () => act(user, 'Resend Activation Invite',
              'Resend activation email to ${user['email'] ?? 'this user'}?',
              'Activation email resent to ${user['email'] ?? 'user'}.', '/api/user/resend-activation/$id', 'POST')),
          IconButton(tooltip: 'Extend 24h', icon: const Icon(Icons.more_time),
            onPressed: acting.contains(id) ? null : () => act(user, 'Extend Invitation',
              'Extend invitation expiry for ${user['email'] ?? 'this user'} by 24 hours?',
              'Invitation expiry extended by 24 hours.', '/api/user/extend-invitation-expiry/$id', 'PUT', {'hours': 24})),
        ],
        if (userStatus == 'inactive' && inviteStatus != 'revoked')
          IconButton(tooltip: 'Revoke', icon: const Icon(Icons.mail_lock, color: Colors.red),
            onPressed: acting.contains(id) ? null : () => act(user, 'Revoke Invitation',
              'Revoke invitation for ${user['email'] ?? 'this user'}?',
              'Invitation revoked.', '/api/user/revoke-invitation/$id', 'PUT')),
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
  bool busy = false, imageBusy = false;
  XFile? pickedImage;
  bool get editing => widget.user != null;
  bool get editingSelf => editing && '${widget.user?['_id'] ?? ''}' == widget.currentId;
  bool get requiresLicense => {'Pilot', 'Mechanic', 'Maintenance Manager', 'Officer-In-Charge'}.contains(jobTitle);
  @override void initState() {
    super.initState();
    final user = widget.user ?? {};
    first.text = '${user['firstName'] ?? ''}'; last.text = '${user['lastName'] ?? ''}';
    email.text = '${user['email'] ?? ''}'; username.text = '${user['username'] ?? ''}';
    license.text = '${user['licenseNo'] ?? ''}';
    jobTitle = user['jobTitle']; access = user['access'] ?? roleAccess[jobTitle];
    if (!editing) { first.addListener(suggestUsername); last.addListener(suggestUsername); }
  }
  void suggestUsername() {
    username.text = suggestUserName(first.text, last.text, widget.users);
  }
  @override void dispose() {
    first.dispose(); last.dispose(); email.dispose(); username.dispose(); license.dispose();
    super.dispose();
  }
  bool get hasChanges {
    final original = widget.user ?? {};
    return pickedImage != null || first.text != '${original['firstName'] ?? ''}' ||
      last.text != '${original['lastName'] ?? ''}' || email.text != '${original['email'] ?? ''}' ||
      username.text != '${original['username'] ?? ''}' || jobTitle != original['jobTitle'] ||
      access != (original['access'] ?? roleAccess[original['jobTitle']]) ||
      license.text != '${original['licenseNo'] ?? ''}';
  }
  Future<void> cancel() async {
    if (busy) return;
    if (!hasChanges) { Navigator.pop(context); return; }
    final discard = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: const Text('Discard changes?'), content: const Text('You have unsaved changes. Cancel and discard them?'),
      actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Keep editing')),
        TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Discard'))]));
    if (discard == true && mounted) Navigator.pop(context);
  }
  Future<void> pickImage(ImageSource source) async {
    try {
      setState(() => imageBusy = true);
      final selected = await ImagePicker().pickImage(source: source, imageQuality: 70);
      if (selected == null) return;
      final sourceBytes = await selected.readAsBytes();
      if (!mounted) return;
      final cropKey = GlobalKey();
      final croppedBytes = await showDialog<List<int>>(context: context, builder: (dialogContext) => AlertDialog(
        title: const Text('Crop Profile Image'),
        content: SizedBox(width: 300, height: 300, child: RepaintBoundary(key: cropKey,
          child: ClipRect(child: InteractiveViewer(minScale: 1, maxScale: 4,
            child: Image.memory(sourceBytes, width: 300, height: 300, fit: BoxFit.cover))))),
        actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
          FilledButton(onPressed: () async {
            final boundary = cropKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
            if (boundary == null) return;
            final screenshot = await boundary.toImage(pixelRatio: 1);
            final data = await screenshot.toByteData(format: ImageByteFormat.png);
            if (dialogContext.mounted && data != null) Navigator.pop(dialogContext, data.buffer.asUint8List());
          }, child: const Text('Use Photo'))]));
      if (croppedBytes == null) return;
      final decoded = image.decodePng(Uint8List.fromList(croppedBytes));
      if (decoded == null) throw const FormatException('Invalid image');
      final resized = image.copyResize(decoded, width: 300, height: 300);
      final file = File('${(await getTemporaryDirectory()).path}/airms-user-${DateTime.now().microsecondsSinceEpoch}.jpg');
      await file.writeAsBytes(image.encodeJpg(resized, quality: 70));
      if (mounted) setState(() { pickedImage = XFile(file.path, mimeType: 'image/jpeg'); error = ''; });
    } catch (_) { if (mounted) setState(() => error = 'Failed to select image. Please try again later.'); }
    finally { if (mounted) setState(() => imageBusy = false); }
  }
  Future<void> submit() async {
    final validation = validateUserForm(first: first.text, last: last.text, email: email.text,
      username: username.text, jobTitle: jobTitle, access: access, license: license.text);
    if (validation != null) { setState(() => error = validation); return; }
    final confirmed = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: Text(editing ? 'Update User' : 'Create User'),
      content: Text(editing ? 'Save changes to this user account?' : 'Create this user account now?'),
      actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(editing ? 'Save' : 'Create'))]));
    if (confirmed != true || !mounted) return;
    setState(() { busy = true; error = ''; });
    try {
      final path = editing ? '/api/user/update-user/${widget.user!['_id']}' : '/api/user/create';
      final fields = <String, String>{
          'firstName': first.text.trim(), 'lastName': last.text.trim(), 'email': email.text.trim(),
          'username': username.text.trim(), 'jobTitle': jobTitle!, 'access': access!,
          'licenseNo': requiresLicense ? license.text.trim() : '', 'confirmAction': 'true',
        };
      Map<String, dynamic> responseData;
      if (pickedImage == null) {
        responseData = Map<String, dynamic>.from(await widget.session.request(path, method: editing ? 'PUT' : 'POST',
          extraHeaders: {'x-action-confirmed': 'true'}, body: fields));
      } else {
        final request = http.MultipartRequest(editing ? 'PUT' : 'POST', Uri.parse('$apiBase$path'));
        request.headers.addAll({...widget.session.headers()..remove('Content-Type'), 'x-action-confirmed': 'true'});
        request.fields.addAll({for (final entry in fields.entries) if (entry.value.isNotEmpty) entry.key: entry.value});
        request.files.add(await http.MultipartFile.fromPath('image', pickedImage!.path,
          filename: pickedImage!.name, contentType: MediaType('image', 'jpeg')));
        final response = await http.Response.fromStream(await request.send());
        final data = decodeResponse(response);
        if (response.statusCode >= 400) throw ApiException('${data['message'] ?? 'User image upload failed'}');
        responseData = data;
      }
      if (mounted) Navigator.pop(context, {...responseData, 'email': email.text.trim()});
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) => PopScope(canPop: false,
    onPopInvokedWithResult: (didPop, _) { if (!didPop) cancel(); },
    child: Dialog(child: ConstrainedBox(
    constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * .92),
    child: Padding(padding: const EdgeInsets.all(14), child: Column(mainAxisSize: MainAxisSize.min, children: [
      Align(alignment: Alignment.centerLeft, child: Text(editing ? 'Edit User' : 'Add User',
        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
      const SizedBox(height: 10),
      Flexible(child: ListView(children: [
      const Text('Profile Image'),
      Row(children: [Container(width: 78, height: 78, alignment: Alignment.center,
        decoration: BoxDecoration(border: Border.all(color: const Color(0xffdddddd)), borderRadius: BorderRadius.circular(10)),
        clipBehavior: Clip.antiAlias,
        child: pickedImage != null ? Image.file(File(pickedImage!.path), fit: BoxFit.cover, width: 78, height: 78)
          : '${widget.user?['image'] ?? ''}'.isNotEmpty ? Image.network(
            '${widget.user!['image']}'.startsWith('http') ? '${widget.user!['image']}' : '$apiBase${'${widget.user!['image']}'.startsWith('/') ? '' : '/'}${widget.user!['image']}',
            fit: BoxFit.cover, width: 78, height: 78) : const Text('No image', style: TextStyle(fontSize: 11))),
        const SizedBox(width: 10), Expanded(child: Column(children: [
          OutlinedButton(onPressed: busy || imageBusy ? null : () => pickImage(ImageSource.gallery), child: const Text('Choose from Gallery')),
          OutlinedButton(onPressed: busy || imageBusy ? null : () => pickImage(ImageSource.camera), child: const Text('Take Photo')),
          if (imageBusy) const CircularProgressIndicator(),
        ]))]),
      TextField(controller: first, inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r"[a-zA-Z'\-\s]"))],
        decoration: const InputDecoration(labelText: 'First Name', hintText: 'Enter first name')),
      TextField(controller: last, inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r"[a-zA-Z'\-\s]"))],
        decoration: const InputDecoration(labelText: 'Last Name', hintText: 'Enter last name')),
      TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email', hintText: 'Enter email')),
      TextField(controller: username, readOnly: true, decoration: const InputDecoration(labelText: 'Username', hintText: 'Auto-generated')),
      DropdownButtonFormField<String>(initialValue: jobTitles.contains(jobTitle) ? jobTitle : null, decoration: const InputDecoration(labelText: 'Job Title'),
        items: jobTitles.map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(),
        onChanged: editingSelf ? null : (value) => setState(() { jobTitle = value; access = roleAccess[value]; if (!requiresLicense) license.clear(); })),
      if (editingSelf) const Text('Your own job title and access level are managed by another Admin Staff.'),
      InputDecorator(decoration: const InputDecoration(labelText: 'Access'), child: Text(access ?? '')),
      if (requiresLicense)
        TextField(controller: license, keyboardType: TextInputType.number, inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
          decoration: const InputDecoration(labelText: 'License No. (6 digits)', hintText: 'Enter license number')),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      ])),
      const SizedBox(height: 12), Row(mainAxisAlignment: MainAxisAlignment.end, children: [
        TextButton(onPressed: busy ? null : cancel, child: const Text('Cancel')),
        const SizedBox(width: 8), FilledButton(onPressed: busy ? null : submit,
          child: busy ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : Text(editing ? 'Save' : 'Create')),
      ]),
    ])))));
}
