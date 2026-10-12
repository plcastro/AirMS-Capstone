import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:url_launcher/url_launcher.dart';
import 'auth.dart';
import 'realtime.dart';

String entityId(dynamic entity) => entity is Map ? '${entity['_id'] ?? entity['id'] ?? ''}' : '$entity';
String displayName(Map user) => '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim().isEmpty
    ? '${user['username'] ?? 'User'}' : '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim();

class ChatTarget {
  ChatTarget({required this.id, required this.title, required this.type, this.subtitle = '', this.lastMessage, this.unread = 0, this.group});
  final String id, title, type, subtitle;
  final Map? lastMessage;
  final int unread;
  final Map? group;
}

class ChatAttachment {
  const ChatAttachment(this.name, this.bytes);
  final String name;
  final Uint8List bytes;
  Future<Uint8List> readAsBytes() async => bytes;
}

class MessagingPage extends StatefulWidget {
  const MessagingPage({super.key, required this.session});
  final AirmsSession session;
  @override State<MessagingPage> createState() => _MessagingPageState();
}
class _MessagingPageState extends State<MessagingPage> {
  List<ChatTarget> targets = [];
  List<Map> users = [];
  String query = '', error = '';
  bool loading = true;
  Timer? poll;
  late final AirmsRealtime realtime;

  @override void initState() {
    super.initState();
    load();
    realtime = AirmsRealtime(widget.session, (event, _) {
      if (mounted && (event.startsWith('chat:') || event == 'message:new')) load(silent: true);
    });
    realtime.start();
    poll = Timer.periodic(const Duration(seconds: 30), (_) { if (!realtime.connected) load(silent: true); });
  }
  @override void dispose() { poll?.cancel(); realtime.dispose(); super.dispose(); }

  Future<void> load({bool silent = false}) async {
    if (!silent) setState(() => loading = true);
    try {
      final result = await Future.wait([
        widget.session.request('/api/messages/conversations'),
        widget.session.request('/api/messages/users'),
      ]);
      final conversations = (result[0]['data'] as List? ?? []);
      final nextUsers = (result[1]['data'] as List? ?? []).whereType<Map>().toList();
      final next = <ChatTarget>[];
      final known = <String>{};
      for (final item in conversations.whereType<Map>()) {
        if (item['type'] == 'group' && item['group'] is Map) {
          final group = item['group'] as Map;
          next.add(ChatTarget(id: entityId(group), title: '${group['name'] ?? 'Group chat'}', type: 'group',
            subtitle: '${(group['members'] as List? ?? []).length} members', lastMessage: item['lastMessage'] as Map?,
            unread: (item['unreadCount'] as num?)?.toInt() ?? 0, group: group));
        } else if (item['user'] is Map) {
          final user = item['user'] as Map;
          final id = entityId(user);
          known.add(id);
          next.add(ChatTarget(id: id, title: displayName(user), type: 'direct',
            subtitle: '${user['jobTitle'] ?? 'User'}', lastMessage: item['lastMessage'] as Map?,
            unread: (item['unreadCount'] as num?)?.toInt() ?? 0));
        }
      }
      for (final user in nextUsers) {
        final id = entityId(user);
        if (!known.contains(id)) {
          next.add(ChatTarget(id: id, title: displayName(user), type: 'direct',
            subtitle: '${user['jobTitle'] ?? 'User'}'));
        }
      }
      if (mounted) setState(() { targets = next; users = nextUsers; error = ''; });
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => loading = false); }
  }

  Future<void> createGroup() async {
    final name = TextEditingController();
    final chosen = <String>{};
    final result = await showDialog<bool>(context: context, builder: (context) => StatefulBuilder(
      builder: (context, update) => AlertDialog(title: const Text('New group'),
        content: SizedBox(width: double.maxFinite, height: 360, child: Column(children: [
          TextField(controller: name, decoration: const InputDecoration(labelText: 'Group name')),
          const SizedBox(height: 8),
          Expanded(child: ListView(children: users.map((user) => CheckboxListTile(
            title: Text(displayName(user)), subtitle: Text('${user['jobTitle'] ?? ''}'),
            value: chosen.contains(entityId(user)),
            onChanged: (checked) => update(() { if (checked == true) { chosen.add(entityId(user)); } else { chosen.remove(entityId(user)); } }),
          )).toList())),
        ])),
        actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Create'))],
      )));
    if (result != true || name.text.trim().isEmpty || chosen.isEmpty) return;
    try {
      final data = await widget.session.request('/api/messages/groups', method: 'POST',
        body: {'name': name.text.trim(), 'memberIds': chosen.toList()});
      await load();
      final group = data['data']?['group'];
      if (mounted && group is Map) open(ChatTarget(id: entityId(group), title: '${group['name']}', type: 'group', group: group));
    } catch (e) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'))); }
  }

  void open(ChatTarget target) => Navigator.push(context, MaterialPageRoute(builder: (_) => ChatPage(
    session: widget.session, target: target))).then((_) => load());

  @override Widget build(BuildContext context) {
    final visible = targets.where((target) => '${target.title} ${target.subtitle}'.toLowerCase().contains(query.toLowerCase())).toList();
    return Column(children: [
      Padding(padding: const EdgeInsets.fromLTRB(16, 8, 16, 8), child: Row(children: [
        Expanded(child: TextField(decoration: InputDecoration(hintText: 'Search users or groups',
          prefixIcon: const Icon(Icons.search), filled: true, fillColor: const Color(0xfff1f3f5),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(21), borderSide: BorderSide.none)),
          onChanged: (value) => setState(() => query = value))),
        IconButton(onPressed: createGroup, icon: const Icon(Icons.group_add_outlined), tooltip: 'New group'),
      ])),
      if (loading) const LinearProgressIndicator(),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      Expanded(child: RefreshIndicator(onRefresh: load, child: ListView.builder(
        itemCount: visible.length, itemBuilder: (context, index) {
          final item = visible[index];
          final hasUnread = item.unread > 0;
          return InkWell(onTap: () => open(item), child: Container(
            decoration: BoxDecoration(color: hasUnread ? const Color(0xffeaf4ff) : Colors.white,
              border: Border(left: BorderSide(width: hasUnread ? 3 : 0, color: const Color(0xff26866f)))),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
            child: Row(children: [
              CircleAvatar(radius: 29, backgroundColor: const Color(0xffe6f4f1),
                child: Text(item.title.isEmpty ? '?' : item.title[0], style: const TextStyle(color: Color(0xff26866f)))),
              const SizedBox(width: 12), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(item.title, style: TextStyle(fontSize: 15, fontWeight: hasUnread ? FontWeight.w900 : FontWeight.w800)),
                Text(item.subtitle, style: const TextStyle(fontSize: 12, color: Colors.black54)),
                Text('${item.lastMessage?['body'] ?? 'Tap to start a conversation'}', maxLines: 1,
                  overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 13, fontWeight: hasUnread ? FontWeight.w700 : FontWeight.w400)),
              ])),
              if (hasUnread) CircleAvatar(radius: 10, backgroundColor: Colors.red,
                child: Text('${item.unread}', style: const TextStyle(fontSize: 10, color: Colors.white))),
            ]),
          ));
        },
      ))),
    ]);
  }
}

class ChatPage extends StatefulWidget {
  const ChatPage({super.key, required this.session, required this.target});
  final AirmsSession session;
  final ChatTarget target;
  @override State<ChatPage> createState() => _ChatPageState();
}
class _ChatPageState extends State<ChatPage> {
  final draft = TextEditingController();
  List<Map> messages = [];
  List<ChatAttachment> attachments = [];
  final attachmentLinks = <String, Future<String?>>{};
  bool sending = false;
  String error = '';
  Timer? poll;
  late final AirmsRealtime realtime;
  @override void initState() {
    super.initState(); load();
    realtime = AirmsRealtime(widget.session, (event, _) {
      if (mounted && (event.startsWith('chat:') || event == 'message:new')) load();
    });
    realtime.start();
    poll = Timer.periodic(const Duration(seconds: 30), (_) { if (!realtime.connected) load(); });
  }
  @override void dispose() { poll?.cancel(); realtime.dispose(); draft.dispose(); super.dispose(); }
  Future<void> load() async {
    try {
      final data = await widget.session.request('/api/messages/${widget.target.id}');
      if (mounted) setState(() { messages = (data['data'] as List? ?? []).whereType<Map>().toList(); error = ''; });
    } catch (e) { if (mounted) setState(() => error = '$e'); }
  }
  Future<void> send() async {
    final body = draft.text.trim();
    if ((body.isEmpty && attachments.isEmpty) || sending) return;
    setState(() { sending = true; error = ''; });
    try {
      if (attachments.isEmpty) {
        await widget.session.request('/api/messages', method: 'POST', body: {
          widget.target.type == 'group' ? 'conversationId' : 'recipientId': widget.target.id,
          'body': body,
        });
      } else {
        final selected = [...attachments];
        Future<http.Response> upload() async {
          final request = http.MultipartRequest('POST', Uri.parse('$apiBase/api/messages'));
          request.headers.addAll({...widget.session.headers()}..remove('Content-Type'));
          request.fields[widget.target.type == 'group' ? 'conversationId' : 'recipientId'] = widget.target.id;
          request.fields['body'] = body;
          for (final file in selected) {
            final extension = file.name.split('.').last.toLowerCase();
            const types = <String, String>{'pdf': 'application/pdf', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp', 'txt': 'text/plain', 'csv': 'text/csv', 'doc': 'application/msword', 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'xls': 'application/vnd.ms-excel', 'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
            final bytes = await file.readAsBytes();
            if (bytes.length > 10 * 1024 * 1024) throw ApiException('${file.name} exceeds the 10 MB limit.');
            request.files.add(http.MultipartFile.fromBytes('attachments', bytes, filename: file.name, contentType: MediaType.parse(types[extension] ?? 'application/octet-stream')));
          }
          return http.Response.fromStream(await request.send());
        }
        var response = await upload();
        if (response.statusCode == 401 && await widget.session.refresh() != null) response = await upload();
        if (response.statusCode >= 400) throw ApiException('${decodeResponse(response)['message'] ?? 'Could not send attachments'}');
      }
      draft.clear(); attachments.clear(); await load();
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => sending = false); }
  }
  Future<void> pickAttachments() async {
    if (attachments.length >= 5) return;
    final files = await FilePicker.pickFiles(type: FileType.custom, allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt', 'csv', 'doc', 'docx', 'xls', 'xlsx']);
    if (files.isEmpty) return;
    final valid = <ChatAttachment>[];
    for (final file in files.take(5 - attachments.length)) {
      final bytes = await file.readAsBytes();
      if (bytes.length <= 10 * 1024 * 1024) {
        valid.add(ChatAttachment(file.name, bytes));
      } else if (mounted) {
        setState(() => error = '${file.name} exceeds the 10 MB attachment limit.');
      }
    }
    if (mounted) setState(() => attachments = [...attachments, ...valid]);
  }
  Future<void> pickImages() async {
    if (attachments.length >= 5) return;
    try {
      final images = await ImagePicker().pickMultiImage(imageQuality: 80);
      if (images.isEmpty) return;
      final available = 5 - attachments.length;
      final chosen = <ChatAttachment>[];
      for (final image in images.take(available)) {
        final bytes = await image.readAsBytes();
        if (bytes.length <= 10 * 1024 * 1024) {
          chosen.add(ChatAttachment(image.name, bytes));
        } else if (mounted) {
          setState(() => error = '${image.name} exceeds the 10 MB attachment limit.');
        }
      }
      if (mounted) setState(() => attachments = [...attachments, ...chosen]);
    } catch (e) { if (mounted) setState(() => error = 'Could not prepare selected images: $e'); }
  }
  Future<void> openAttachment(Map message, int index) async {
    try {
      final result = await widget.session.request('/api/messages/${entityId(message)}/attachments/$index');
      final value = '${result['data']?['url'] ?? ''}';
      final uri = Uri.tryParse(value.startsWith('/uploads/') ? '$apiBase$value' : value);
      if (uri == null || !['http', 'https'].contains(uri.scheme) || !await launchUrl(uri, mode: LaunchMode.externalApplication)) throw const ApiException('Could not open attachment.');
    } catch (e) { if (mounted) setState(() => error = '$e'); }
  }
  Future<String?> attachmentImageUrl(Map message, int index) async {
    try {
      final result = await widget.session.request('/api/messages/${entityId(message)}/attachments/$index');
      final value = '${result['data']?['url'] ?? ''}';
      final uri = Uri.tryParse(value.startsWith('/uploads/') ? '$apiBase$value' : value);
      return uri != null && ['http', 'https'].contains(uri.scheme) ? uri.toString() : null;
    } catch (_) { return null; }
  }
  Future<void> groupMembers() async {
    final group = widget.target.group ?? {};
    final me = '${widget.session.user?['_id'] ?? widget.session.user?['id'] ?? ''}';
    final creator = entityId(group['createdBy']);
    final members = (group['members'] as List? ?? []).whereType<Map>().toList();
    final action = await showModalBottomSheet<String>(context: context, isScrollControlled: true, builder: (sheetContext) => SafeArea(child: ListView(shrinkWrap: true, children: [
      ListTile(title: Text(widget.target.title, style: Theme.of(context).textTheme.titleMedium), subtitle: Text('${members.length} members')),
      ...members.map((member) => ListTile(title: Text(displayName(member)), subtitle: Text('${member['jobTitle'] ?? ''}'),
        trailing: creator == me && entityId(member) != me ? IconButton(icon: const Icon(Icons.person_remove_outlined), onPressed: () => Navigator.pop(sheetContext, entityId(member))) : null)),
      ListTile(leading: const Icon(Icons.exit_to_app), title: const Text('Leave group'), onTap: () => Navigator.pop(sheetContext, 'leave')),
    ])));
    if (action == null) return;
    if (!mounted) return;
    final confirmed = await showDialog<bool>(context: context, builder: (dialogContext) => AlertDialog(title: Text(action == 'leave' ? 'Leave group?' : 'Remove member?'),
      actions: [TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')), FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Confirm'))]));
    if (confirmed != true) return;
    try {
      await widget.session.request(action == 'leave' ? '/api/messages/groups/${widget.target.id}/members/me' : '/api/messages/groups/${widget.target.id}/members/$action', method: 'DELETE');
      if (mounted) Navigator.pop(context);
    } catch (e) { if (mounted) setState(() => error = '$e'); }
  }
  @override Widget build(BuildContext context) {
    final me = '${widget.session.user?['_id'] ?? widget.session.user?['id'] ?? ''}';
    return Scaffold(appBar: AppBar(title: Text(widget.target.title), actions: [if (widget.target.type == 'group') IconButton(onPressed: groupMembers, icon: const Icon(Icons.group_outlined))]), body: Column(children: [
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      Expanded(child: ListView.builder(reverse: true, padding: const EdgeInsets.all(12), itemCount: messages.length,
        itemBuilder: (context, index) {
          final message = messages[messages.length - 1 - index];
          final mine = entityId(message['sender']) == me;
          return Align(alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
            child: Container(constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * .78),
              margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
              decoration: BoxDecoration(color: mine ? const Color(0xff26866f) : const Color(0xffe9ecef),
                borderRadius: BorderRadius.circular(18)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                if (widget.target.type == 'group' && !mine)
                  Text(displayName(message['sender'] is Map ? message['sender'] as Map : {}),
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xff26866f))),
                if ('${message['body'] ?? ''}'.isNotEmpty) Text('${message['body']}', style: TextStyle(color: mine ? Colors.white : Colors.black)),
                ...((message['attachments'] as List? ?? []).asMap().entries.map((entry) {
                  final attachment = entry.value is Map ? entry.value as Map : {};
                  final isImage = '${attachment['kind'] ?? ''}'.toLowerCase() == 'image' ||
                    '${attachment['mimeType'] ?? attachment['type'] ?? ''}'.toLowerCase().startsWith('image/');
                  if (isImage) {
                    final key = '${entityId(message)}:${entry.key}';
                    return FutureBuilder<String?>(future: attachmentLinks.putIfAbsent(key,
                      () => attachmentImageUrl(message, entry.key)), builder: (context, snapshot) =>
                      InkWell(onTap: () => openAttachment(message, entry.key), child: Padding(
                        padding: const EdgeInsets.only(top: 5), child: snapshot.data == null
                          ? Text('${attachment['name'] ?? 'Photo'}', style: TextStyle(color: mine ? Colors.white : const Color(0xff26866f)))
                          : ClipRRect(borderRadius: BorderRadius.circular(10), child: Image.network(snapshot.data!,
                            width: 220, height: 160, fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => const SizedBox(width: 220, height: 80,
                              child: Center(child: Icon(Icons.broken_image_outlined))))))));
                  }
                  return TextButton.icon(onPressed: () => openAttachment(message, entry.key), icon: Icon(Icons.attach_file, color: mine ? Colors.white : const Color(0xff26866f)),
                    label: Text('${attachment['name'] ?? 'Attachment'}', style: TextStyle(color: mine ? Colors.white : const Color(0xff26866f))));
                })),
                if (message['createdAt'] != null) Align(alignment: Alignment.centerRight,
                  child: Text('${message['createdAt']}', style: TextStyle(fontSize: 10,
                    color: mine ? Colors.white70 : Colors.black54))),
              ])));
        })),
      if (attachments.isNotEmpty) SizedBox(height: 50, child: ListView(scrollDirection: Axis.horizontal, children: attachments.map((file) => InputChip(label: Text(file.name), onDeleted: () => setState(() => attachments.remove(file)))).toList())),
      SafeArea(top: false, child: Padding(padding: const EdgeInsets.all(8), child: Row(children: [
        IconButton(onPressed: sending ? null : pickImages, icon: const Icon(Icons.image_outlined), tooltip: 'Add images'),
        IconButton(onPressed: sending ? null : pickAttachments, icon: const Icon(Icons.attach_file)),
        Expanded(child: TextField(controller: draft, maxLines: 4, minLines: 1,
          decoration: const InputDecoration(hintText: 'Message', border: OutlineInputBorder()))),
        IconButton(onPressed: sending ? null : send, icon: const Icon(Icons.send, color: Color(0xff26866f))),
      ]))),
    ]));
  }
}
