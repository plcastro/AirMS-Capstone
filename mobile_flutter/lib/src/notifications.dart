import 'package:flutter/material.dart';
import 'auth.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key, required this.session, required this.onTarget});
  final AirmsSession session;
  final ValueChanged<Map<String, dynamic>> onTarget;
  @override State<NotificationsPage> createState() => _NotificationsPageState();
}
class _NotificationsPageState extends State<NotificationsPage> {
  List<Map<String, dynamic>> notifications = [];
  bool loading = true;
  String error = '';
  @override void initState() { super.initState(); load(); }
  Future<void> load() async {
    setState(() => loading = true);
    try {
      final data = await widget.session.request('/api/notifications');
      final list = data['data'] is List ? data['data'] as List : data['notifications'] is List ? data['notifications'] as List : [];
      if (mounted) setState(() { notifications = list.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList(); error = ''; });
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => loading = false); }
  }
  bool isRead(Map notification) {
    final id = '${widget.session.user?['_id'] ?? widget.session.user?['id'] ?? ''}';
    return (notification['readBy'] as List? ?? []).any((reader) => '$reader' == id || reader is Map && '${reader['_id']}' == id);
  }
  Future<void> action(String path) async {
    try { await widget.session.request(path, method: 'POST'); await load(); }
    catch (e) { if (mounted) setState(() => error = '$e'); }
  }
  String target(Map notification) => switch ('${notification['module'] ?? ''}'.toLowerCase()) {
    'flight-logs' => 'Flight Logs', 'pre-flight inspections' => 'Pre-Flight Inspection',
    'post-inspections' || 'post-flight inspections' => 'Post-Flight Inspection',
    'tasks' => 'Tasks', 'messages' => 'Messages',
    'parts-requisition' || 'parts-requisitions' => 'Parts Requisition', _ => '',
  };
  @override Widget build(BuildContext context) => Column(children: [
    Padding(padding: const EdgeInsets.all(16), child: Row(children: [
      const Expanded(child: Text('Notifications', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
      IconButton(tooltip: 'Refresh', onPressed: load, icon: const Icon(Icons.refresh)),
    ])),
    Row(mainAxisAlignment: MainAxisAlignment.end, children: [
      TextButton(onPressed: () => action('/api/notifications/mark-all-read'), child: const Text('Mark all read')),
      TextButton(onPressed: () => action('/api/notifications/clear-read'), child: const Text('Clear read')),
    ]),
    if (loading) const LinearProgressIndicator(),
    if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
    Expanded(child: RefreshIndicator(onRefresh: load, child: ListView.builder(itemCount: notifications.length,
      itemBuilder: (context, index) {
        final notification = notifications[index];
        final read = isRead(notification);
        return ListTile(tileColor: read ? Colors.white : const Color(0xffeaf4ff),
          leading: Icon(read ? Icons.notifications_none : Icons.notifications_active,
            color: const Color(0xff26866f)),
          title: Text('${notification['title'] ?? ''}', style: TextStyle(fontWeight: read ? FontWeight.normal : FontWeight.bold)),
          subtitle: Text('${notification['description'] ?? ''}\n${notification['createdAt'] ?? ''}'),
          isThreeLine: true,
          onTap: () async {
            await action('/api/notifications/${notification['_id']}/read');
            widget.onTarget(notification);
          });
      }))),
  ]);
}
