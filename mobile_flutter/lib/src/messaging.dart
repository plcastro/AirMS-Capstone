import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'search.dart';
import 'toast.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image/image.dart' as img;
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import 'auth.dart';
import 'realtime.dart';
import 'messaging_upload.dart';

String entityId(dynamic entity) =>
    entity is Map ? '${entity['_id'] ?? entity['id'] ?? ''}' : '$entity';
String displayName(Map user) =>
    '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim().isEmpty
    ? '${user['username'] ?? 'User'}'
    : '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim();

String messagingInitials(Map? user) {
  final first = '${user?['firstName'] ?? ''}';
  final last = '${user?['lastName'] ?? ''}';
  final letters =
      '${first.isEmpty ? '' : first[0]}${last.isEmpty ? '' : last[0]}'
          .toUpperCase()
          .trim();
  return letters.isEmpty ? 'U' : letters;
}

String conversationPreview(ChatTarget target, Map? me) {
  final last = target.lastMessage;
  if (last == null) return 'Tap to start a conversation';
  final body = '${last['body'] ?? ''}';
  final attachments = last['attachments'] as List? ?? [];
  if (body.isEmpty && attachments.isEmpty) return 'Tap to start a conversation';
  final mine = entityId(last['sender']) == entityId(me);
  final sender = mine
      ? 'You'
      : target.type == 'group'
      ? displayName(
          (target.group?['members'] as List? ?? []).whereType<Map>().firstWhere(
            (member) => entityId(member) == entityId(last['sender']),
            orElse: () => {},
          ),
        )
      : target.title;
  final first = attachments.isEmpty || attachments.first is! Map
      ? {}
      : attachments.first as Map;
  final label =
      '${first['kind'] == 'image' ? 'Photo' : 'File'}: ${first['name'] ?? ''}${attachments.length > 1 ? ' +${attachments.length - 1}' : ''}';
  return '$sender: ${body.isNotEmpty ? body : label}';
}

String messageTime(Object? value) {
  final date = DateTime.tryParse('${value ?? ''}')?.toLocal();
  if (date == null) return '';
  final now = DateTime.now();
  if (date.year != now.year || date.month != now.month || date.day != now.day) {
    return '${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}/${date.year}';
  }
  final hour = date.hour % 12 == 0 ? 12 : date.hour % 12;
  return '$hour:${date.minute.toString().padLeft(2, '0')} ${date.hour < 12 ? 'AM' : 'PM'}';
}

Future<Map<String, dynamic>?> messageGet(
  AirmsSession session,
  String path,
) async {
  if (session.idleExpired) {
    throw const ApiException(
      'Session expired due to inactivity. Sign in again.',
    );
  }
  Future<http.Response> send() =>
      http.get(Uri.parse('$apiBase$path'), headers: session.headers());
  var response = await send();
  if (response.statusCode == 401 && await session.refresh() != null) {
    response = await send();
  }
  if (response.statusCode == 404) return null;
  final data = decodeResponse(response);
  if (response.statusCode >= 400) {
    throw ApiException(
      '${data['message'] ?? 'Request failed (${response.statusCode})'}',
    );
  }
  return data;
}

class ChatTarget {
  ChatTarget({
    required this.id,
    required this.title,
    required this.type,
    this.subtitle = '',
    this.lastMessage,
    this.unread = 0,
    this.group,
    this.user,
  });
  final String id, title, type, subtitle;
  final Map? lastMessage;
  final int unread;
  final Map? group;
  final Map? user;
}

class ChatAttachment {
  const ChatAttachment(this.name, this.bytes, [this.mimeType]);
  final String name;
  final Uint8List bytes;
  final String? mimeType;
  Future<Uint8List> readAsBytes() async => bytes;
}

ChatAttachment prepareChatAttachment(
  String name,
  Uint8List bytes, [
  String? declaredMime,
]) {
  final mime = messageMime(name, declaredMime);
  if (!mime.startsWith('image/') || mime == 'image/gif') {
    return ChatAttachment(name, bytes, mime);
  }
  final decoded = img.decodeImage(bytes);
  if (decoded == null || (decoded.width <= 1600 && decoded.height <= 1600)) {
    return ChatAttachment(name, bytes, mime);
  }
  final wide = decoded.width >= decoded.height;
  final resized = img.copyResize(
    decoded,
    width: wide ? 1600 : null,
    height: wide ? null : 1600,
    interpolation: img.Interpolation.linear,
  );
  final png = mime == 'image/png';
  final output = Uint8List.fromList(
    png ? img.encodePng(resized) : img.encodeJpg(resized, quality: 80),
  );
  final base = name.replaceFirst(RegExp(r'\.[^.]+$'), '');
  return ChatAttachment(
    '$base.${png ? 'png' : 'jpg'}',
    output,
    png ? 'image/png' : 'image/jpeg',
  );
}

class MessagingPage extends StatefulWidget {
  const MessagingPage({super.key, required this.session});
  final AirmsSession session;
  @override
  State<MessagingPage> createState() => _MessagingPageState();
}

class _MessagingPageState extends State<MessagingPage>
    with WidgetsBindingObserver {
  List<ChatTarget> targets = [];
  List<Map> users = [];
  String query = '';
  bool loading = true;
  Timer? poll;
  late AirmsRealtime realtime;
  bool showingChat = false;
  bool live = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    load();
    connectRealtime();
  }

  void connectRealtime() {
    if (live) return;
    live = true;
    realtime = AirmsRealtime(widget.session, (event, data) {
      if (mounted &&
          (event.startsWith('chat:') ||
              event == 'message:new' ||
              (event == 'data-changed' &&
                  '${data['url'] ?? ''}'.startsWith('/api/messages')))) {
        load(silent: true);
      }
    });
    realtime.start();
    poll = Timer.periodic(const Duration(seconds: 30), (_) {
      if (!realtime.connected) load(silent: true);
    });
  }

  void stopRealtime() {
    if (!live) return;
    live = false;
    poll?.cancel();
    poll = null;
    realtime.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && !showingChat) {
      connectRealtime();
      load(silent: true);
    } else if (state != AppLifecycleState.resumed && !showingChat) {
      stopRealtime();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    if (!showingChat) stopRealtime();
    super.dispose();
  }

  Future<void> load({bool silent = false}) async {
    if (!silent) setState(() => loading = true);
    try {
      final conversationsResponse =
          await messageGet(widget.session, '/api/messages/conversations') ??
          {'data': []};
      final usersResult = await messageGet(
        widget.session,
        '/api/messages/users',
      );
      final usersResponse =
          usersResult ??
          await widget.session.request('/api/user/get-all-users');
      final conversations = (conversationsResponse['data'] as List? ?? []);
      var nextUsers = (usersResponse['data'] as List? ?? [])
          .whereType<Map>()
          .toList();
      nextUsers = nextUsers
          .where(
            (user) =>
                entityId(user) != entityId(widget.session.user) &&
                (usersResult != null ||
                    '${user['status'] ?? ''}'.toLowerCase() == 'active'),
          )
          .toList();
      final next = <ChatTarget>[];
      final known = <String>{};
      for (final item in conversations.whereType<Map>()) {
        if (item['type'] == 'group' && item['group'] is Map) {
          final group = item['group'] as Map;
          next.add(
            ChatTarget(
              id: entityId(group),
              title: '${group['name'] ?? 'Group chat'}',
              type: 'group',
              subtitle: '${(group['members'] as List? ?? []).length} members',
              lastMessage: item['lastMessage'] as Map?,
              unread: (item['unreadCount'] as num?)?.toInt() ?? 0,
              group: group,
            ),
          );
        } else if (item['user'] is Map) {
          final user = item['user'] as Map;
          final id = entityId(user);
          known.add(id);
          next.add(
            ChatTarget(
              id: id,
              title: displayName(user),
              type: 'direct',
              subtitle: '${user['jobTitle'] ?? 'User'}',
              lastMessage: item['lastMessage'] as Map?,
              unread: (item['unreadCount'] as num?)?.toInt() ?? 0,
              user: user,
            ),
          );
        }
      }
      for (final user in nextUsers) {
        final id = entityId(user);
        if (!known.contains(id)) {
          next.add(
            ChatTarget(
              id: id,
              title: displayName(user),
              type: 'direct',
              subtitle: '${user['jobTitle'] ?? 'User'}',
              user: user,
            ),
          );
        }
      }
      next.sort((a, b) {
        final at =
            DateTime.tryParse(
              '${a.lastMessage?['createdAt'] ?? a.group?['updatedAt'] ?? ''}',
            )?.millisecondsSinceEpoch ??
            0;
        final bt =
            DateTime.tryParse(
              '${b.lastMessage?['createdAt'] ?? b.group?['updatedAt'] ?? ''}',
            )?.millisecondsSinceEpoch ??
            0;
        return bt.compareTo(at);
      });
      if (mounted) {
        setState(() {
          targets = next;
          users = nextUsers;
        });
      }
    } catch (e) {
      if (mounted) {
        AirmsToast.show(e);
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> createGroup() async {
    final name = TextEditingController();
    final chosen = <String>{};
    String memberQuery = '';
    bool creating = false;
    final group = await showDialog<Map?>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, update) => AlertDialog(
          title: const Text('New group chat'),
          content: SizedBox(
            width: double.maxFinite,
            height: 360,
            child: Column(
              children: [
                TextField(
                  controller: name,
                  maxLength: 80,
                  decoration: const InputDecoration(labelText: 'Group name'),
                ),
                TextField(
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.search),
                    hintText: 'Search members',
                  ),
                  onChanged: (value) => update(() => memberQuery = value),
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: ListView(
                    children: users
                        .where(
                          (user) =>
                              '${displayName(user)} ${user['username'] ?? ''} ${user['email'] ?? ''}'
                                  .toLowerCase()
                                  .contains(memberQuery.trim().toLowerCase()),
                        )
                        .map(
                          (user) => CheckboxListTile(
                            secondary: CircleAvatar(
                              radius: 17,
                              backgroundColor: const Color(0xffe9f4f1),
                              child: Text(
                                messagingInitials(user),
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xff26866f),
                                ),
                              ),
                            ),
                            title: Text(displayName(user)),
                            subtitle: Text('${user['jobTitle'] ?? 'User'}'),
                            value: chosen.contains(entityId(user)),
                            onChanged: (checked) => update(() {
                              if (checked == true) {
                                chosen.add(entityId(user));
                              } else {
                                chosen.remove(entityId(user));
                              }
                            }),
                          ),
                        )
                        .toList(),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: creating ? null : () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: creating
                  ? null
                  : () async {
                      final groupName = name.text.trim();
                      if (groupName.isEmpty || chosen.isEmpty) {
                        AirmsToast.show(
                          'Add a group name and at least one member',
                        );
                        return;
                      }
                      update(() => creating = true);
                      try {
                        final data = await widget.session.request(
                          '/api/messages/groups',
                          method: 'POST',
                          body: {
                            'name': groupName,
                            'memberIds': chosen.toList(),
                          },
                        );
                        if (context.mounted) {
                          Navigator.pop(
                            context,
                            data['data']?['group'] as Map?,
                          );
                        }
                      } catch (e) {
                        AirmsToast.show(e);
                        if (context.mounted) update(() => creating = false);
                      }
                    },
              child: Text(creating ? 'Creating...' : 'Create'),
            ),
          ],
        ),
      ),
    );
    name.dispose();
    if (group != null) {
      await load();
      if (mounted) {
        open(
          ChatTarget(
            id: entityId(group),
            title: '${group['name']}',
            type: 'group',
            subtitle: '${(group['members'] as List? ?? []).length} members',
            group: group,
          ),
        );
      }
    }
  }

  Future<void> open(ChatTarget target) async {
    stopRealtime();
    showingChat = true;
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ChatPage(session: widget.session, target: target),
      ),
    );
    showingChat = false;
    if (mounted) {
      connectRealtime();
      load(silent: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final visible = targets
        .where(
          (target) => matchesSearch(query, [target.title, target.subtitle]),
        )
        .toList();
    return Stack(
      children: [
        Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      decoration: InputDecoration(
                        hintText: 'Search users or groups',
                        prefixIcon: const Icon(Icons.search),
                        filled: true,
                        fillColor: const Color(0xfff1f3f5),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(21),
                          borderSide: BorderSide.none,
                        ),
                      ),
                      onChanged: (value) => setState(() => query = value),
                    ),
                  ),
                ],
              ),
            ),
            if (loading)
              const Expanded(child: Center(child: CircularProgressIndicator())),
            if (!loading)
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () => load(silent: true),
                  child: visible.isEmpty
                      ? ListView(
                          children: const [
                            SizedBox(height: 56),
                            Icon(
                              Icons.message_outlined,
                              size: 42,
                              color: Color(0xffb7c6c2),
                            ),
                            SizedBox(height: 10),
                            Center(
                              child: Text(
                                'No conversations',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.black54,
                                ),
                              ),
                            ),
                          ],
                        )
                      : ListView.builder(
                          itemCount: visible.length,
                          itemBuilder: (context, index) {
                            final item = visible[index];
                            final hasUnread = item.unread > 0;
                            return InkWell(
                              onTap: () => open(item),
                              child: Container(
                                decoration: BoxDecoration(
                                  color: hasUnread
                                      ? const Color(0xffeaf4ff)
                                      : Colors.white,
                                  border: Border(
                                    left: BorderSide(
                                      width: hasUnread ? 3 : 0,
                                      color: const Color(0xff26866f),
                                    ),
                                  ),
                                ),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 9,
                                ),
                                child: Row(
                                  children: [
                                    Stack(
                                      clipBehavior: Clip.none,
                                      children: [
                                        CircleAvatar(
                                          radius: 29,
                                          backgroundColor: const Color(
                                            0xffe6f4f1,
                                          ),
                                          foregroundImage:
                                              item.user?['image'] == null
                                              ? null
                                              : NetworkImage(
                                                  '${item.user!['image']}'
                                                          .startsWith('http')
                                                      ? '${item.user!['image']}'
                                                      : '$apiBase${item.user!['image']}',
                                                ),
                                          child: item.type == 'group'
                                              ? const Icon(
                                                  Icons.group,
                                                  color: Color(0xff26866f),
                                                )
                                              : Text(
                                                  messagingInitials(item.user),
                                                  style: const TextStyle(
                                                    color: Color(0xff26866f),
                                                  ),
                                                ),
                                        ),
                                        if (hasUnread)
                                          Positioned(
                                            right: -2,
                                            top: -2,
                                            child: Container(
                                              width: 18,
                                              height: 18,
                                              alignment: Alignment.center,
                                              decoration: BoxDecoration(
                                                color: const Color(0xffdc3545),
                                                shape: BoxShape.circle,
                                                border: Border.all(
                                                  color: Colors.white,
                                                  width: 2,
                                                ),
                                              ),
                                              child: Text(
                                                '${item.unread}',
                                                style: const TextStyle(
                                                  fontSize: 9,
                                                  color: Colors.white,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  item.title,
                                                  maxLines: 1,
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                  style: TextStyle(
                                                    fontSize: 15,
                                                    fontWeight: hasUnread
                                                        ? FontWeight.w900
                                                        : FontWeight.w800,
                                                  ),
                                                ),
                                              ),
                                              if (item.lastMessage?['createdAt'] !=
                                                  null)
                                                Padding(
                                                  padding:
                                                      const EdgeInsets.only(
                                                        left: 8,
                                                      ),
                                                  child: Text(
                                                    messageTime(
                                                      item.lastMessage!['createdAt'],
                                                    ),
                                                    style: const TextStyle(
                                                      fontSize: 11,
                                                      color: Colors.black54,
                                                    ),
                                                  ),
                                                ),
                                            ],
                                          ),
                                          Text(
                                            item.subtitle,
                                            style: const TextStyle(
                                              fontSize: 12,
                                              color: Colors.black54,
                                            ),
                                          ),
                                          Padding(
                                            padding: const EdgeInsets.only(
                                              top: 5,
                                            ),
                                            child: Text(
                                              conversationPreview(
                                                item,
                                                widget.session.user,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: TextStyle(
                                                fontSize: 13,
                                                color: hasUnread
                                                    ? Colors.black
                                                    : const Color(0xff5c5c5c),
                                                fontWeight: hasUnread
                                                    ? FontWeight.w700
                                                    : FontWeight.w400,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ),
          ],
        ),
        Positioned(
          right: 24,
          bottom: 48,
          child: FloatingActionButton(
            onPressed: createGroup,
            backgroundColor: const Color(0xff26866f),
            child: const Icon(Icons.edit, color: Colors.white),
          ),
        ),
      ],
    );
  }
}

class ChatPage extends StatefulWidget {
  const ChatPage({super.key, required this.session, required this.target});
  final AirmsSession session;
  final ChatTarget target;
  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> with WidgetsBindingObserver {
  final draft = TextEditingController();
  List<Map> messages = [];
  List<ChatAttachment> attachments = [];
  final attachmentLinks = <String, Future<String?>>{};
  final attachmentExpiry = <String, DateTime>{};
  Map? currentGroup;
  bool sending = false;
  Timer? poll;
  late AirmsRealtime realtime;
  bool live = false;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    currentGroup = widget.target.group;
    load();
    connectRealtime();
  }

  void connectRealtime() {
    if (live) return;
    live = true;
    realtime = AirmsRealtime(widget.session, (event, data) {
      final group = data['group'];
      if (group is Map && entityId(group) == widget.target.id && mounted) {
        setState(() => currentGroup = group);
      }
      final me = entityId(widget.session.user);
      final stillMember =
          group is Map &&
          (group['members'] as List? ?? []).any(
            (member) => entityId(member) == me,
          );
      if (data['removedConversationId'] == widget.target.id &&
          !stillMember &&
          mounted) {
        Navigator.pop(context);
        return;
      }
      if (event == 'chat:message' && mounted) {
        final conversationId = data['conversation'] != null
            ? entityId(data['conversation'])
            : entityId(data['sender']) == me
            ? entityId(data['recipient'])
            : entityId(data['sender']);
        if (conversationId == widget.target.id) {
          setState(() {
            final index = messages.indexWhere(
              (message) => entityId(message) == entityId(data),
            );
            if (index >= 0) {
              messages[index] = {
                ...messages[index],
                ...data,
                'deliveryStatus': 'sent',
              };
            } else {
              messages.add({...data, 'deliveryStatus': 'sent'});
            }
          });
        }
      }
      if (event == 'chat:read' && mounted) {
        final ids = (data['messageIds'] as List? ?? [])
            .map((id) => '$id')
            .toSet();
        setState(() {
          messages = messages
              .map(
                (message) => ids.contains(entityId(message))
                    ? {
                        ...message,
                        'readAt': data['readAt'],
                        'deliveryStatus': 'sent',
                      }
                    : message,
              )
              .toList();
        });
      }
      if (mounted &&
          (event.startsWith('chat:') ||
              event == 'message:new' ||
              (event == 'data-changed' &&
                  '${data['url'] ?? ''}'.startsWith('/api/messages')))) {
        load();
      }
    });
    realtime.start();
    poll = Timer.periodic(const Duration(seconds: 30), (_) {
      if (!realtime.connected) load();
    });
  }

  void stopRealtime() {
    if (!live) return;
    live = false;
    poll?.cancel();
    poll = null;
    realtime.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      connectRealtime();
      load();
    } else {
      stopRealtime();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    stopRealtime();
    draft.dispose();
    super.dispose();
  }

  Future<void> load() async {
    try {
      final data = await widget.session.request(
        '/api/messages/${widget.target.id}',
      );
      if (mounted) {
        setState(() {
          attachmentExpiry.removeWhere((key, expiry) {
            if (expiry.isAfter(DateTime.now().add(const Duration(seconds: 30)))) {
              return false;
            }
            attachmentLinks.remove(key);
            return true;
          });
          final fetched = (data['data'] as List? ?? [])
              .whereType<Map>()
              .toList();
          final ids = fetched.map(entityId).toSet();
          final local = messages.where(
            (message) =>
                !ids.contains(entityId(message)) &&
                ('${message['_id']}'.startsWith('local-') ||
                    message['deliveryStatus'] == 'failed'),
          );
          messages = [...fetched, ...local]
            ..sort(
              (a, b) =>
                  (DateTime.tryParse('${a['createdAt'] ?? ''}') ??
                          DateTime(9999))
                      .compareTo(
                        DateTime.tryParse('${b['createdAt'] ?? ''}') ??
                            DateTime(9999),
                      ),
            );
        });
      }
    } catch (_) {}
  }

  Future<void> send() async {
    final body = draft.text.trim();
    if ((body.isEmpty && attachments.isEmpty) || sending) return;
    final selected = [...attachments];
    for (final file in selected) {
      final invalid = messageAttachmentError(
        file.name,
        file.bytes.length,
        file.mimeType,
      );
      if (invalid != null) {
        AirmsToast.show(invalid);
        return;
      }
    }
    final tempId = 'local-${DateTime.now().microsecondsSinceEpoch}';
    setState(() {
      sending = true;
      messages.add({
        '_id': tempId,
        'sender': {
          '_id': widget.session.user?['_id'] ?? widget.session.user?['id'],
        },
        'body': body,
        'attachments': selected
            .map(
              (file) => {
                'name': file.name,
                'mimeType': messageMime(file.name, file.mimeType),
                'kind':
                    messageMime(file.name, file.mimeType).startsWith('image/')
                    ? 'image'
                    : 'file',
                'localBytes': file.bytes,
              },
            )
            .toList(),
        'createdAt': DateTime.now().toUtc().toIso8601String(),
        'deliveryStatus': 'sending',
      });
      draft.clear();
      attachments.clear();
    });
    try {
      Map? sentMessage;
      if (selected.isEmpty || !localMessageApi) {
        final uploaded = selected.isEmpty
            ? <Map<String, dynamic>>[]
            : await uploadMessageBlobs(
                widget.session,
                '${widget.session.user?['id'] ?? widget.session.user?['_id']}',
                selected
                    .map(
                      (file) =>
                          MessageBlobFile(file.name, file.bytes, file.mimeType),
                    )
                    .toList(),
              );
        final result = await widget.session.request(
          '/api/messages',
          method: 'POST',
          body: {
            widget.target.type == 'group' ? 'conversationId' : 'recipientId':
                widget.target.id,
            'body': body,
            'attachments': uploaded,
          },
        );
        sentMessage = result['data'] is Map ? result['data'] as Map : null;
      } else {
        Future<http.Response> upload() async {
          final request = localMessageRequest(
            widget.session,
            widget.target.id,
            widget.target.type == 'group',
            body,
            selected
                .map(
                  (file) =>
                      MessageBlobFile(file.name, file.bytes, file.mimeType),
                )
                .toList(),
          );
          return http.Response.fromStream(await request.send());
        }

        var response = await upload();
        if (response.statusCode == 401 &&
            await widget.session.refresh() != null) {
          response = await upload();
        }
        if (response.statusCode >= 400) {
          throw ApiException(
            '${decodeResponse(response)['message'] ?? 'Could not send attachments'}',
          );
        }
        final result = decodeResponse(response);
        sentMessage = result['data'] is Map ? result['data'] as Map : null;
      }
      if (mounted) {
        setState(() {
          messages.removeWhere((message) => message['_id'] == tempId);
          if (sentMessage != null &&
              !messages.any(
                (message) => entityId(message) == entityId(sentMessage),
              )) {
            messages.add({...sentMessage, 'deliveryStatus': 'sent'});
          }
        });
      }
      await load();
    } catch (e) {
      if (mounted) {
        setState(() {
          if (draft.text.isEmpty) draft.text = body;
          if (attachments.isEmpty) attachments = selected;
          final index = messages.indexWhere(
            (message) => message['_id'] == tempId,
          );
          if (index >= 0) {
            messages[index] = {...messages[index], 'deliveryStatus': 'failed'};
          }
        });
        AirmsToast.show(messageUploadError(e));
      }
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  Future<void> pickAttachments() async {
    if (attachments.length >= 5) return;
    final files = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: [
        'pdf',
        'jpg',
        'jpeg',
        'png',
        'gif',
        'webp',
        'heic',
        'heif',
        'bmp',
        'avif',
        'tif',
        'tiff',
        'txt',
        'csv',
        'doc',
        'docx',
        'xls',
        'xlsx',
      ],
    );
    if (files.isEmpty) return;
    if (files.length > 5 - attachments.length) {
      AirmsToast.show('You can attach up to 5 files per message.');
    }
    final valid = <ChatAttachment>[];
    for (final file in files.take(5 - attachments.length)) {
      final bytes = await file.readAsBytes();
      final prepared = prepareChatAttachment(file.name, bytes);
      final invalid = messageAttachmentError(
        prepared.name,
        prepared.bytes.length,
        prepared.mimeType,
      );
      if (invalid == null) {
        valid.add(prepared);
      } else {
        AirmsToast.show(invalid);
      }
    }
    if (mounted) setState(() => attachments = [...attachments, ...valid]);
  }

  Future<void> pickImages() async {
    if (attachments.length >= 5) return;
    try {
      final images = await ImagePicker().pickMultiImage(
        imageQuality: 80,
        maxWidth: 1600,
        maxHeight: 1600,
      );
      if (images.isEmpty) return;
      final available = 5 - attachments.length;
      if (images.length > available) {
        AirmsToast.show('You can attach up to 5 files per message.');
      }
      final chosen = <ChatAttachment>[];
      for (final image in images.take(available)) {
        final bytes = await image.readAsBytes();
        final prepared = prepareChatAttachment(
          image.name,
          bytes,
          image.mimeType,
        );
        final invalid = messageAttachmentError(
          prepared.name,
          prepared.bytes.length,
          prepared.mimeType,
        );
        if (invalid == null) {
          chosen.add(prepared);
        } else {
          AirmsToast.show(invalid);
        }
      }
      if (mounted) setState(() => attachments = [...attachments, ...chosen]);
    } catch (e) {
      if (mounted) AirmsToast.show('Could not prepare selected images: $e');
    }
  }

  Future<void> openAttachment(Map message, int index) async {
    try {
      final result = await widget.session.request(
        '/api/messages/${entityId(message)}/attachments/$index',
      );
      final value = '${result['data']?['url'] ?? ''}';
      final uri = Uri.tryParse(
        value.startsWith('/uploads/') ? '$apiBase$value' : value,
      );
      if (uri == null ||
          !['http', 'https'].contains(uri.scheme) ||
          !await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        throw const ApiException('Could not open attachment.');
      }
    } catch (e) {
      if (mounted) AirmsToast.show(e);
    }
  }

  Future<String?> attachmentImageUrl(Map message, int index) async {
    try {
      final result = await widget.session.request(
        '/api/messages/${entityId(message)}/attachments/$index',
      );
      final key = '${entityId(message)}:$index';
      attachmentExpiry[key] =
          DateTime.tryParse('${result['data']?['expiresAt'] ?? ''}') ??
          DateTime(9999);
      final value = '${result['data']?['url'] ?? ''}';
      final uri = Uri.tryParse(
        value.startsWith('/uploads/') ? '$apiBase$value' : value,
      );
      return uri != null && ['http', 'https'].contains(uri.scheme)
          ? uri.toString()
          : null;
    } catch (_) {
      return null;
    }
  }

  Future<void> previewImage(Map message, int index, String name) async {
    final items = message['attachments'] as List? ?? [];
    final localBytes = index < items.length && items[index] is Map
        ? (items[index] as Map)['localBytes']
        : null;
    final url = localBytes is Uint8List
        ? null
        : await attachmentImageUrl(message, index);
    if ((url == null && localBytes is! Uint8List) || !mounted) return;
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => Dialog.fullscreen(
        backgroundColor: const Color(0xeb000000),
        child: SafeArea(
          child: Column(
            children: [
              Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.pop(dialogContext),
                    icon: const Icon(Icons.close, color: Colors.white),
                  ),
                  Expanded(
                    child: Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              Expanded(
                child: InteractiveViewer(
                  child: Center(
                    child: localBytes is Uint8List
                        ? Image.memory(localBytes, fit: BoxFit.contain)
                        : Image.network(url!, fit: BoxFit.contain),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> groupMembers() async {
    final group = currentGroup ?? {};
    final members = (group['members'] as List? ?? []).whereType<Map>().toList();
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Row(
          children: [
            const Expanded(child: Text('Members')),
            IconButton(
              onPressed: () => Navigator.pop(dialogContext),
              icon: const Icon(Icons.close),
            ),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          height: members.isEmpty ? 70 : 320,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${widget.target.title} - ${members.length} members',
                style: const TextStyle(fontSize: 12, color: Colors.black54),
              ),
              if (members.isEmpty)
                const Expanded(child: Center(child: Text('No members')))
              else
                Expanded(
                  child: ListView(
                    children: members
                        .map(
                          (member) => ListTile(
                            leading: CircleAvatar(
                              child: Text(displayName(member).substring(0, 1)),
                            ),
                            title: Text(displayName(member)),
                            subtitle: Text('${member['jobTitle'] ?? 'User'}'),
                          ),
                        )
                        .toList(),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final me =
        '${widget.session.user?['_id'] ?? widget.session.user?['id'] ?? ''}';
    return Scaffold(
      backgroundColor: const Color(0xfff7f9f8),
      appBar: AppBar(
        backgroundColor: Colors.white,
        titleSpacing: 0,
        title: InkWell(
          onTap: widget.target.type == 'group' ? groupMembers : null,
          child: Row(
            children: [
              CircleAvatar(
                radius: 19,
                backgroundColor: const Color(0xffe9f4f1),
                foregroundImage: widget.target.user?['image'] == null
                    ? null
                    : NetworkImage(
                        '${widget.target.user!['image']}'.startsWith('http')
                            ? '${widget.target.user!['image']}'
                            : '$apiBase${widget.target.user!['image']}',
                      ),
                child: widget.target.type == 'group'
                    ? const Icon(Icons.group, color: Color(0xff26866f))
                    : Text(
                        messagingInitials(widget.target.user),
                        style: const TextStyle(color: Color(0xff26866f)),
                      ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.target.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      widget.target.subtitle.isEmpty && currentGroup == null
                          ? 'Conversation'
                          : currentGroup == null
                          ? widget.target.subtitle
                          : '${(currentGroup?['members'] as List? ?? []).length} members',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        color: Colors.black54,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          if (widget.target.type == 'group')
            IconButton(
              onPressed: groupMembers,
              icon: const Icon(Icons.group_outlined),
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              reverse: true,
              padding: const EdgeInsets.all(12),
              itemCount: messages.length,
              itemBuilder: (context, index) {
                final message = messages[messages.length - 1 - index];
                final mine = entityId(message['sender']) == me;
                return Column(
                  children: [
                    Align(
                      alignment: mine
                          ? Alignment.centerRight
                          : Alignment.centerLeft,
                      child: Container(
                        constraints: BoxConstraints(
                          maxWidth: MediaQuery.sizeOf(context).width * .78,
                        ),
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 13,
                          vertical: 9,
                        ),
                        decoration: BoxDecoration(
                          color: mine
                              ? const Color(0xff26866f)
                              : const Color(0xffe9ecef),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if ('${message['body'] ?? ''}'.isNotEmpty)
                              Text(
                                '${message['body']}',
                                style: TextStyle(
                                  color: mine ? Colors.white : Colors.black,
                                ),
                              ),
                            ...((message['attachments'] as List? ?? []).asMap().entries.map((
                              entry,
                            ) {
                              final attachment = entry.value is Map
                                  ? entry.value as Map
                                  : {};
                              final isImage =
                                  '${attachment['kind'] ?? ''}'.toLowerCase() ==
                                      'image' ||
                                  '${attachment['mimeType'] ?? attachment['type'] ?? ''}'
                                      .toLowerCase()
                                      .startsWith('image/');
                              if (isImage) {
                                if (attachment['localBytes'] is Uint8List) {
                                  return InkWell(
                                    onTap: () => previewImage(
                                      message,
                                      entry.key,
                                      '${attachment['name'] ?? 'Attachment'}',
                                    ),
                                    child: Padding(
                                      padding: const EdgeInsets.only(top: 5),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          ClipRRect(
                                            borderRadius: BorderRadius.circular(
                                              12,
                                            ),
                                            child: Image.memory(
                                              attachment['localBytes']
                                                  as Uint8List,
                                              width: 210,
                                              height: 150,
                                              fit: BoxFit.cover,
                                            ),
                                          ),
                                          Text(
                                            '${attachment['name'] ?? 'Attachment'}',
                                            maxLines: 1,
                                            style: TextStyle(
                                              color: mine
                                                  ? Colors.white
                                                  : Colors.black,
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                }
                                final key = '${entityId(message)}:${entry.key}';
                                return FutureBuilder<String?>(
                                  future: attachmentLinks.putIfAbsent(
                                    key,
                                    () =>
                                        attachmentImageUrl(message, entry.key),
                                  ),
                                  builder: (context, snapshot) => InkWell(
                                    onTap: () => previewImage(
                                      message,
                                      entry.key,
                                      '${attachment['name'] ?? 'Attachment'}',
                                    ),
                                    child: Padding(
                                      padding: const EdgeInsets.only(top: 5),
                                      child: snapshot.data == null
                                          ? Text(
                                              '${attachment['name'] ?? 'Photo'}',
                                              style: TextStyle(
                                                color: mine
                                                    ? Colors.white
                                                    : const Color(0xff26866f),
                                              ),
                                            )
                                          : Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                ClipRRect(
                                                  borderRadius:
                                                      BorderRadius.circular(12),
                                                  child: Image.network(
                                                    snapshot.data!,
                                                    width: 210,
                                                    height: 150,
                                                    fit: BoxFit.cover,
                                                    errorBuilder: (_, _, _) =>
                                                        const SizedBox(
                                                          width: 210,
                                                          height: 80,
                                                          child: Center(
                                                            child: Icon(
                                                              Icons
                                                                  .broken_image_outlined,
                                                            ),
                                                          ),
                                                        ),
                                                  ),
                                                ),
                                                Text(
                                                  '${attachment['name'] ?? 'Attachment'}',
                                                  maxLines: 1,
                                                  style: TextStyle(
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.bold,
                                                    color: mine
                                                        ? Colors.white
                                                        : Colors.black,
                                                  ),
                                                ),
                                              ],
                                            ),
                                    ),
                                  ),
                                );
                              }
                              return TextButton.icon(
                                onPressed: () =>
                                    openAttachment(message, entry.key),
                                icon: Icon(
                                  Icons.attach_file,
                                  color: mine
                                      ? Colors.white
                                      : const Color(0xff26866f),
                                ),
                                label: Text(
                                  '${attachment['name'] ?? 'Attachment'}',
                                  style: TextStyle(
                                    color: mine
                                        ? Colors.white
                                        : const Color(0xff26866f),
                                  ),
                                ),
                              );
                            })),
                          ],
                        ),
                      ),
                    ),
                    Align(
                      alignment: mine
                          ? Alignment.centerRight
                          : Alignment.centerLeft,
                      child: Padding(
                        padding: const EdgeInsets.only(
                          left: 4,
                          right: 4,
                          bottom: 8,
                        ),
                        child: Text(
                          "${messageTime(message['createdAt'])}${mine ? ' ${message['deliveryStatus'] == 'sending'
                                    ? 'Sending...'
                                    : message['deliveryStatus'] == 'failed'
                                    ? 'Failed'
                                    : widget.target.type == 'group'
                                    ? 'Sent'
                                    : message['readAt'] == null
                                    ? 'Sent'
                                    : 'Seen'}' : ''}",
                          style: const TextStyle(
                            fontSize: 10,
                            color: Colors.black54,
                          ),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
          if (attachments.isNotEmpty)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.fromLTRB(10, 0, 10, 4),
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: const Color(0xffecefee)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'ATTACHED FILES',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: Colors.black54,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: attachments
                        .map(
                          (file) => InputChip(
                            avatar: Icon(
                              messageMime(file.name).startsWith('image/')
                                  ? Icons.image_outlined
                                  : Icons.insert_drive_file_outlined,
                              size: 17,
                            ),
                            label: SizedBox(
                              width: file.name.length > 24 ? 190 : null,
                              child: Text(
                                file.name,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                            onDeleted: () =>
                                setState(() => attachments.remove(file)),
                          ),
                        )
                        .toList(),
                  ),
                ],
              ),
            ),
          SafeArea(
            top: false,
            child: Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
              child: Row(
                children: [
                  IconButton(
                    onPressed: sending ? null : pickAttachments,
                    icon: const Icon(Icons.attach_file),
                    tooltip: 'Add files',
                    style: IconButton.styleFrom(
                      backgroundColor: const Color(0xfff1f3f5),
                    ),
                  ),
                  const SizedBox(width: 6),
                  IconButton(
                    onPressed: sending ? null : pickImages,
                    icon: const Icon(Icons.image_outlined),
                    tooltip: 'Add images',
                    style: IconButton.styleFrom(
                      backgroundColor: const Color(0xfff1f3f5),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: TextField(
                      controller: draft,
                      maxLines: 4,
                      minLines: 1,
                      maxLength: 1000,
                      decoration: const InputDecoration(
                        hintText: 'Message',
                        counterText: '',
                        filled: true,
                        fillColor: Color(0xfff1f3f5),
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 9,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.all(Radius.circular(20)),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ValueListenableBuilder<TextEditingValue>(
                    valueListenable: draft,
                    builder: (context, value, _) => IconButton(
                      onPressed:
                          sending ||
                              (value.text.trim().isEmpty && attachments.isEmpty)
                          ? null
                          : send,
                      icon: sending
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : const Icon(Icons.send, color: Colors.white),
                      style: IconButton.styleFrom(
                        backgroundColor:
                            value.text.trim().isEmpty && attachments.isEmpty
                            ? const Color(0xffb7c6c2)
                            : const Color(0xff26866f),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
