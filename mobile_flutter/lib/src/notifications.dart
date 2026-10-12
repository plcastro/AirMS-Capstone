import 'package:flutter/material.dart';
import 'auth.dart';
import 'notification_display.dart';
import 'toast.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key, required this.session, required this.onTarget, this.onChanged});
  final AirmsSession session;
  final ValueChanged<Map<String, dynamic>> onTarget;
  final VoidCallback? onChanged;
  @override State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  List<Map<String, dynamic>> notifications = [];
  bool loading = true;
  String busy = '', error = '';
  String get userId => '${widget.session.user?['_id'] ?? widget.session.user?['id'] ?? ''}';
  int get unreadCount => notifications.where((item) => !notificationIsRead(item, userId)).length;
  int get readCount => notifications.length - unreadCount;
  @override void initState() { super.initState(); load(); }

  Future<void> load() async {
    if (mounted) setState(() => loading = true);
    try {
      final data = await widget.session.request('/api/notifications');
      final list = data is List ? data : data['data'] is List ? data['data'] as List
        : data['notifications'] is List ? data['notifications'] as List : [];
      if (mounted) {
        setState(() {
          notifications = list.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList()
            ..sort((a, b) => '${b['createdAt'] ?? ''}'.compareTo('${a['createdAt'] ?? ''}'));
          error = '';
        });
        widget.onChanged?.call();
      }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => loading = false); }
  }

  Future<void> action(String key, String path) async {
    if (busy.isNotEmpty) return;
    setState(() => busy = key);
    try {
      await widget.session.request(path, method: 'POST');
      await load();
    } catch (e) {
      if (mounted) { setState(() => error = '$e'); AirmsToast.show(e); }
    } finally { if (mounted) setState(() => busy = ''); }
  }

  Future<void> confirmClear() async {
    final clear = await showDialog<bool>(context: context, builder: (context) => AlertDialog(
      title: const Text('Clear read notifications?'),
      content: const Text('This will remove all notifications you have already read from your notification list.'),
      actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Clear Read'))],
    ));
    if (clear == true) await action('clear', '/api/notifications/clear-read');
  }

  @override Widget build(BuildContext context) => Column(children: [
    Padding(padding: const EdgeInsets.fromLTRB(16, 12, 8, 8), child: Row(children: [
      const Icon(Icons.notifications_outlined, size: 22), const SizedBox(width: 8),
      const Text('Notifications', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
      const SizedBox(width: 8), Chip(label: Text('$unreadCount Unread')),
      const Spacer(),
      IconButton(tooltip: 'Close', onPressed: busy.isEmpty ? () => Navigator.pop(context) : null,
        icon: const Icon(Icons.close)),
    ])),
    if (loading && notifications.isEmpty) const Padding(padding: EdgeInsets.all(36),
      child: Column(children: [CircularProgressIndicator(), SizedBox(height: 10), Text('Loading notifications...')])),
    if (error.isNotEmpty) Padding(padding: const EdgeInsets.all(12),
      child: Text(error, style: const TextStyle(color: Colors.red))),
    if (!loading && notifications.isEmpty) const Expanded(child: Center(child: Column(
      mainAxisSize: MainAxisSize.min, children: [Icon(Icons.notifications_off_outlined, size: 32),
        SizedBox(height: 10), Text('No notifications')]))),
    if (notifications.isNotEmpty) Expanded(child: RefreshIndicator(onRefresh: load,
      child: ListView.builder(itemCount: notifications.length, itemBuilder: (context, index) {
        final notification = notifications[index];
        final read = notificationIsRead(notification, userId);
        final display = notificationDisplay(notification);
        return Card(color: read ? Colors.white : const Color(0xfff6ffed),
          margin: const EdgeInsets.fromLTRB(12, 4, 12, 6), child: InkWell(onTap: busy.isNotEmpty ? null : () async {
            final id = '${notification['_id'] ?? notification['id'] ?? ''}';
            if (id.isNotEmpty && !id.startsWith('local-')) await action('read', '/api/notifications/$id/read');
            if (context.mounted) widget.onTarget(notification);
          }, child: Padding(padding: const EdgeInsets.all(12), child: Row(
            crossAxisAlignment: CrossAxisAlignment.start, children: [
              CircleAvatar(backgroundColor: read ? Colors.grey : const Color(0xff52c41a),
                child: const Icon(Icons.notifications_outlined, color: Colors.white)),
              const SizedBox(width: 12), Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Wrap(crossAxisAlignment: WrapCrossAlignment.center, spacing: 6, children: [
                    Text(display.title, style: TextStyle(fontWeight: read ? FontWeight.w600 : FontWeight.w700)),
                    if (!read) const Chip(label: Text('New')),
                  ]),
                  if (display.description.isNotEmpty) Text(display.description),
                  const SizedBox(height: 6),
                  Text(notificationTimeAgo(notification['createdAt']),
                    style: const TextStyle(color: Colors.black54, fontSize: 12)),
                ])),
            ]))));
      }))),
    const Divider(),
    Padding(padding: const EdgeInsets.symmetric(horizontal: 8), child: Wrap(children: [
      TextButton(onPressed: busy.isEmpty ? () => action('mark', '/api/notifications/mark-all-read') : null,
        child: Text(busy == 'mark' ? 'Processing...' : 'Mark all as read')),
      TextButton(onPressed: busy.isEmpty && readCount > 0 ? confirmClear : null,
        child: Text(busy == 'clear' ? 'Clearing...' : 'Clear read')),
      TextButton(onPressed: busy.isEmpty ? load : null, child: const Text('Refresh')),
    ])),
  ]);
}
