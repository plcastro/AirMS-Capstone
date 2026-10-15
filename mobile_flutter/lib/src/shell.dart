import 'dart:async';
import 'package:flutter/material.dart';
import 'auth.dart';
import 'messaging.dart';
import 'user_management.dart';
import 'tasks.dart';
import 'requisitions.dart';
import 'profile.dart';
import 'notifications.dart';
import 'priority.dart';
import 'maintenance_logs.dart';
import 'activity_logs.dart';
import 'flight_logs.dart';
import 'flight_inspections.dart';
import 'parts_monitoring.dart';
import 'maintenance_tracking.dart';
import 'mechanics.dart';
import 'reports.dart';
import 'push.dart';
import 'access.dart';
import 'search.dart';
import 'toast.dart';
import 'notification_display.dart';

class Module {
  const Module(this.title, this.path, this.icon, this.roles);
  final String title, path;
  final IconData icon;
  final Set<String> roles;
}

const manager = 'maintenance manager', admin = 'admin staff', mechanic = 'mechanic';
const officer = 'officer-in-charge', pilot = 'pilot', warehouse = 'warehouse personnel';
String sessionRole(AirmsSession session) {
  return resolveUserRole(session.user);
}
const modules = <Module>[
  Module('Reports and Analytics', '/api/tasks/analytics/base-maintenance', Icons.bar_chart, {manager, officer, admin}),
  Module('Messages', '/api/messages/conversations', Icons.message_outlined, {admin, manager, mechanic, pilot, officer, warehouse}),
  Module('Manage Users', '/api/user/get-all-users', Icons.people_outline, {admin}),
  Module('Activity Logs', '/api/logs/getAllUserLogs?page=1&limit=100', Icons.history, {admin}),
  Module('Flight Logs', '/api/flightlogs?page=1&limit=500&sortBy=updatedAt&sortOrder=desc', Icons.flight, {manager, pilot, officer, mechanic, admin}),
  Module('Maintenance Logs', '/api/maintenance-logs/getAllMaintenanceLog', Icons.build_outlined, {manager, officer, mechanic, admin}),
  Module('Pre-Flight Inspection', '/api/pre-flight/getAllPreInspection', Icons.fact_check_outlined, {manager, pilot, officer, mechanic, admin}),
  Module('Post-Flight Inspection', '/api/post-flight/getAllPostInspection', Icons.rule, {manager, officer, mechanic, admin}),
  Module('Tasks', '/api/tasks/getAll', Icons.task_alt, {admin, manager, mechanic}),
  Module('Mechanics', '/api/user/assignable-users', Icons.engineering_outlined, {manager, admin, mechanic}),
  Module('Parts Lifespan Monitoring', '/api/parts-monitoring/aircraft-list', Icons.inventory_2_outlined, {manager, officer, admin}),
  Module('Maintenance Tracking', '/api/ai-insights/maintenance-tracking', Icons.monitor_heart_outlined, {manager, officer, admin}),
  Module('Maintenance Priority Sorting', '/api/parts-monitoring/maintenance-priority', Icons.low_priority, {manager, admin}),
  Module('Parts Requisition', '/api/parts-requisition/get-all-requisition', Icons.shopping_cart_outlined, {manager, mechanic, officer, warehouse, admin}),
  Module('Profile', '', Icons.person_outline, {admin, manager, mechanic, pilot, officer, warehouse}),
];

const drawerGroups = <String, List<String>>{
  'GENERAL': ['Reports and Analytics', 'Messages'],
  'USER MANAGEMENT': ['Manage Users', 'Activity Logs'],
  'AIRCRAFT HEALTH LOGBOOK': ['Flight Logs', 'Maintenance Logs', 'Pre-Flight Inspection', 'Post-Flight Inspection'],
  'TASK ASSIGNMENT & MONITORING': ['Tasks', 'Mechanics'],
  'PARTS LIFESPAN & MAINTENANCE TRACKING': ['Parts Lifespan Monitoring', 'Maintenance Tracking', 'Maintenance Priority Sorting'],
  'PARTS REQUISITION': ['Parts Requisition'],
  'SETTINGS': ['Profile'],
};

class AirmsShell extends StatefulWidget {
  const AirmsShell({super.key, required this.session, required this.onLogout, this.link, required this.onLinkHandled});
  final AirmsSession session;
  final VoidCallback onLogout;
  final Uri? link;
  final VoidCallback onLinkHandled;
  @override State<AirmsShell> createState() => _AirmsShellState();
}
class _AirmsShellState extends State<AirmsShell> with WidgetsBindingObserver {
  late final List<Module> allowed;
  late Module selected;
  late final PushService push;
  Timer? idleTimer;
  Timer? notificationTimer;
  int unreadNotifications = 0;
  bool checkingNotifications = false;
  int warnedMinutes = 0;
  bool endingSession = false;
  DateTime lastPersistedActivity = DateTime.fromMillisecondsSinceEpoch(0);
  @override void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    idleTimer = Timer.periodic(const Duration(seconds: 15), (_) => checkIdle());
    final role = sessionRole(widget.session);
    allowed = modules.where((module) => module.roles.contains(role)).toList();
    final home = switch (role) {
      admin => 'Manage Users', mechanic => 'Tasks', pilot => 'Flight Logs',
      manager || officer => 'Reports and Analytics', warehouse => 'Parts Requisition',
      _ => 'Profile',
    };
    selected = allowed.where((module) => module.title == home).firstOrNull ?? modules.last;
    push = PushService(widget.session, openNotification, (message) {
      if (!mounted) return;
      final title = message.notification?.title ?? 'AirMS notification';
      final body = message.notification?.body ?? '';
      AirmsToast.show(body.isEmpty ? title : '$title\n$body');
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(body.isEmpty ? title : '$title — $body'),
        action: SnackBarAction(label: 'Open', onPressed: () => openNotification(Map<String, dynamic>.from(message.data)))));
    });
    pushPreferenceChanged.addListener(onPushPreferenceChanged);
    push.start();
    refreshUnread();
    notificationTimer = Timer.periodic(const Duration(seconds: 30), (_) => refreshUnread());
    checkIdle();
    WidgetsBinding.instance.addPostFrameCallback((_) => openLink());
  }
  @override void didUpdateWidget(covariant AirmsShell oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.link != oldWidget.link) WidgetsBinding.instance.addPostFrameCallback((_) => openLink());
  }
  void openLink() {
    final link = widget.link;
    if (!mounted || link == null) return;
    final segments = link.pathSegments.where((part) => part.isNotEmpty).toList();
    final segment = segments.isEmpty ? link.host : segments.last;
    const routeModules = {
      'reports-and-analytics': 'Reports and Analytics', 'messages': 'Messages',
      'user-management': 'Manage Users', 'activity-logs': 'Activity Logs',
      'flight-log': 'Flight Logs', 'maintenance-log': 'Maintenance Logs',
      'pre-flight-inspection': 'Pre-Flight Inspection', 'post-flight-inspection': 'Post-Flight Inspection',
      'tasks': 'Tasks', 'mechanics': 'Mechanics', 'parts-lifespan-monitoring': 'Parts Lifespan Monitoring',
      'maintenance-tracking': 'Maintenance Tracking', 'maintenance-priority': 'Maintenance Priority Sorting',
      'parts-requisition': 'Parts Requisition', 'profile': 'Profile',
    };
    final module = routeModules[segment];
    if (module != null) {
      final target = allowed.where((item) => item.title == module).firstOrNull;
      if (target != null) setState(() => selected = target);
      final id = link.queryParameters['entityId'] ?? link.queryParameters['id'] ?? '';
      if (target != null && id.isNotEmpty && ['flight-log', 'tasks', 'parts-requisition', 'pre-flight-inspection', 'post-flight-inspection'].contains(segment)) {
        final notificationModule = switch (segment) {
          'flight-log' => 'flight-logs', 'pre-flight-inspection' => 'pre-flight inspections',
          'post-flight-inspection' => 'post-flight inspections', _ => segment,
        };
        openNotification({'module': notificationModule, 'entityId': id});
      }
    }
    widget.onLinkHandled();
  }
  Future<void> openNotification(Map<String, dynamic> payload) async {
    if (!mounted) return;
    final data = payload['data'] is Map ? Map<String, dynamic>.from(payload['data']) : <String, dynamic>{};
    final metadata = payload['metadata'] is Map ? Map<String, dynamic>.from(payload['metadata']) : <String, dynamic>{};
    final moduleName = '${payload['module'] ?? data['module'] ?? metadata['module'] ?? ''}'.trim().toLowerCase();
    const aliases = {'flight logbook': 'Flight Logs', 'flight logs': 'Flight Logs',
      'pre-inspection': 'Pre-Flight Inspection', 'pre-flight inspection': 'Pre-Flight Inspection',
      'post-inspection': 'Post-Flight Inspection', 'post-flight inspection': 'Post-Flight Inspection',
      'tasks': 'Tasks', 'messages': 'Messages', 'parts requisition': 'Parts Requisition'};
    final targetScreen = aliases['${payload['targetScreen'] ?? data['targetScreen'] ?? metadata['targetScreen'] ?? ''}'.trim().toLowerCase()];
    if (moduleName == 'sessions') return;
    const validModules = {'flight-logs', 'pre-flight inspections', 'post-inspections',
      'post-flight inspections', 'tasks', 'messages', 'parts-requisition', 'parts-requisitions'};
    if (moduleName.isNotEmpty && !validModules.contains(moduleName)) return;
    final name = targetScreen ?? switch (moduleName) {
      'flight-logs' => 'Flight Logs', 'pre-flight inspections' => 'Pre-Flight Inspection',
      'post-inspections' || 'post-flight inspections' => 'Post-Flight Inspection',
      'tasks' => 'Tasks', 'messages' => 'Messages',
      'parts-requisition' || 'parts-requisitions' => 'Parts Requisition', _ => '',
    };
    final target = allowed.where((module) => module.title == name).firstOrNull;
    if (target == null) return;
    setState(() => selected = target);
    final id = '${payload['entityId'] ?? payload['targetFlightLogId'] ?? payload['targetTaskId'] ?? payload['targetRequestId'] ??
      payload['targetPreInspectionId'] ?? payload['targetPostInspectionId'] ?? data['entityId'] ?? data['targetFlightLogId'] ??
      data['targetTaskId'] ?? data['targetRequestId'] ?? data['targetPreInspectionId'] ?? data['targetPostInspectionId'] ?? ''}';
    final notificationId = '${payload['_id'] ?? payload['notificationId'] ?? data['notificationId'] ?? ''}';
    if (notificationId.isNotEmpty && !notificationId.startsWith('local-')) {
      try { await widget.session.request('/api/notifications/$notificationId/read', method: 'POST'); refreshUnread(); } catch (_) {}
    }
    if (!mounted) return;
    try {
      if (name == 'Flight Logs') {
        if (id.isEmpty) return;
        await Navigator.push(context, MaterialPageRoute(builder: (_) => FlightWorkspacePage(session: widget.session, id: id)));
      } else if (name == 'Tasks') {
        if (id.isEmpty) return;
        final response = await widget.session.request('/api/tasks/getAll');
        final records = (response['data'] as List? ?? []).whereType<Map>();
        final record = records.where((item) => '${item['_id'] ?? item['id']}' == id).firstOrNull;
        if (record != null && mounted) {
          await Navigator.push(context, MaterialPageRoute(builder: (_) => TaskDetailPage(
            session: widget.session, task: Map<String, dynamic>.from(record),
            head: {'maintenance manager', 'admin staff'}.contains(sessionRole(widget.session)))));
        }
      } else if (name == 'Parts Requisition') {
        if (id.isEmpty) return;
        final response = await widget.session.request('/api/parts-requisition/get-all-requisition');
        final records = (response['data'] as List? ?? []).whereType<Map>();
        final record = records.where((item) => '${item['_id'] ?? item['id']}' == id).firstOrNull;
        if (record != null && mounted) {
          await Navigator.push(context, MaterialPageRoute(builder: (_) => RequisitionDetailPage(
            session: widget.session, record: Map<String, dynamic>.from(record))));
        }
      } else if (name == 'Pre-Flight Inspection' || name == 'Post-Flight Inspection') {
        if (id.isEmpty) return;
        final response = await widget.session.request(name == 'Pre-Flight Inspection'
          ? '/api/pre-flight/getAllPreInspection' : '/api/post-flight/getAllPostInspection');
        final records = (response['data'] as List? ?? []).whereType<Map>();
        final record = records.where((item) => '${item['_id'] ?? item['id']}' == id).firstOrNull;
        final flightId = record?['flightLogId'] is Map
          ? '${(record!['flightLogId'] as Map)['_id'] ?? ''}' : '${record?['flightLogId'] ?? ''}';
        if (flightId.isNotEmpty && mounted) {
          await Navigator.push(context, MaterialPageRoute(builder: (_) => FlightWorkspacePage(session: widget.session, id: flightId)));
        } else if (record != null && mounted) {
          await Navigator.push(context, MaterialPageRoute(builder: (_) => InspectionDetailPage(
            item: Map<String, dynamic>.from(record), kind: name == 'Pre-Flight Inspection' ? 'pre' : 'post')));
        }
      } else if (name == 'Messages') {
        final group = '${payload['isGroup'] ?? data['isGroup'] ?? ''}'.toLowerCase() == 'true' ||
          '${metadata['notificationType'] ?? ''}' == 'group-message';
        final conversationId = '${group ? (payload['conversationId'] ?? data['conversationId'] ?? metadata['conversationId'] ?? '') :
          (payload['senderUserId'] ?? data['senderUserId'] ?? metadata['senderUserId'] ?? '')}';
        if (conversationId.isEmpty) return;
        final response = await widget.session.request('/api/messages/conversations');
        final records = (response['data'] as List? ?? []).whereType<Map>();
        final conversation = records.where((item) {
          if (group) return '${(item['group'] as Map?)?['_id'] ?? ''}' == conversationId;
          return '${(item['user'] as Map?)?['_id'] ?? ''}' == conversationId;
        }).firstOrNull;
        if (conversation != null && mounted) {
          final record = group ? conversation['group'] as Map : conversation['user'] as Map;
          await Navigator.push(context, MaterialPageRoute(builder: (_) => ChatPage(session: widget.session,
            target: ChatTarget(id: conversationId, title: group ? '${record['name'] ?? 'Group chat'}' : displayName(record),
              type: group ? 'group' : 'direct', group: group ? record : null))));
        }
      }
    } catch (e) {
      if (mounted) AirmsToast.show('Could not open that notification.');
    }
  }
  void activity() {
    if (endingSession || widget.session.idleExpired) { checkIdle(); return; }
    warnedMinutes = 0;
    if (DateTime.now().difference(lastPersistedActivity) >= const Duration(seconds: 1)) {
      lastPersistedActivity = DateTime.now();
      widget.session.markClientActivity();
    }
  }
  Future<void> refreshUnread() async {
    if (!mounted || checkingNotifications ||
        WidgetsBinding.instance.lifecycleState == AppLifecycleState.paused) {
      return;
    }
    checkingNotifications = true;
    try {
      final response = await widget.session.request('/api/notifications');
      final list = response is List ? response : response['data'] is List ? response['data'] as List
        : response['notifications'] is List ? response['notifications'] as List : [];
      final userId = '${widget.session.user?['_id'] ?? widget.session.user?['id'] ?? ''}';
      final count = list.whereType<Map>().where((item) => !notificationIsRead(item, userId)).length;
      if (mounted) setState(() => unreadNotifications = count);
    } catch (_) {} finally { checkingNotifications = false; }
  }
  Future<void> checkIdle() async {
    if (!mounted || endingSession) return;
    if (widget.session.idleExpired) {
      endingSession = true;
      await widget.session.logout();
      if (mounted) widget.onLogout();
      return;
    }
    final remaining = AirmsSession.idleLimit - DateTime.now().difference(widget.session.lastActivityAt);
    final threshold = remaining <= const Duration(minutes: 5) ? 5 : remaining <= const Duration(minutes: 10) ? 10 : 0;
    if (threshold > 0 && (warnedMinutes == 0 || threshold < warnedMinutes)) {
      warnedMinutes = threshold;
      try {
        await widget.session.request('/api/notifications/session-warning', method: 'POST', body: {
          'lastActivityAt': widget.session.lastActivityAt.millisecondsSinceEpoch,
          'thresholdMinutes': threshold,
        });
      } catch (_) {}
    }
  }
  Future<void> confirmLogout() async {
    final confirmed = await showDialog<bool>(context: context, builder: (dialogContext) => AlertDialog(
      title: const Text('Confirm Logout'),
      content: const Text('Are you sure you want to log out?'),
      actions: [TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Log Out'))],
    ));
    if (confirmed != true) return;
    await push.unregister();
    await widget.session.logout();
    if (mounted) widget.onLogout();
  }
  @override void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) { checkIdle(); refreshUnread(); }
  }
  void onPushPreferenceChanged() {
    if (pushPreferenceChanged.value == true) push.start();
  }
  @override void dispose() { idleTimer?.cancel(); notificationTimer?.cancel(); WidgetsBinding.instance.removeObserver(this); pushPreferenceChanged.removeListener(onPushPreferenceChanged); push.dispose(); super.dispose(); }
  @override Widget build(BuildContext context) => Listener(
    onPointerDown: (_) => activity(), onPointerSignal: (_) => activity(),
    child: Scaffold(
    appBar: AppBar(title: Text(selected.title, style: const TextStyle(fontSize: 17)),
      actions: [IconButton(icon: Badge(backgroundColor: const Color(0xffd31e1e), isLabelVisible: unreadNotifications > 0,
        label: Text(unreadNotifications > 99 ? '99+' : '$unreadNotifications'),
        child: const Icon(Icons.notifications_outlined)), onPressed: () => showGeneralDialog(
        context: context, barrierDismissible: true, barrierLabel: 'Close notifications',
        barrierColor: Colors.black.withValues(alpha: .35),
        pageBuilder: (dialogContext, _, _) => Material(color: Colors.transparent,
          child: SafeArea(child: Align(alignment: Alignment.topRight,
            child: Padding(padding: const EdgeInsets.fromLTRB(14, 48, 14, 0),
              child: ConstrainedBox(constraints: BoxConstraints(maxWidth: 420,
                maxHeight: MediaQuery.sizeOf(dialogContext).height * .78),
                child: DecoratedBox(decoration: BoxDecoration(color: Colors.white,
                  borderRadius: BorderRadius.circular(18)),
                  child: NotificationsPage(session: widget.session, onChanged: refreshUnread, onTarget: (payload) {
            Navigator.pop(context);
            openNotification(payload);
          }))))))))),
      IconButton(icon: const Icon(Icons.account_circle_outlined), onPressed: () => setState(() => selected = modules.last))]),
    drawer: Drawer(width: MediaQuery.sizeOf(context).width * .85,
      child: SafeArea(child: Column(children: [
      Padding(padding: const EdgeInsets.only(bottom: 10, top: 8),
        child: Image.asset('assets/airmslogo_dark.png', width: 120, height: 40, fit: BoxFit.contain)),
      Expanded(child: ListView(children: [for (final group in drawerGroups.entries)
        if (allowed.any((module) => group.value.contains(module.title))) ...[
          Padding(padding: const EdgeInsets.fromLTRB(18, 8, 8, 2), child: Text(group.key,
            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1, color: Color(0xff777777)))),
          for (final module in allowed.where((item) => group.value.contains(item.title)))
            ListTile(leading: Icon(module.icon, color: selected == module ? const Color(0xff26866f) : const Color(0xff777777)),
              selected: selected == module, selectedTileColor: const Color(0xffe6f4f1),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10),
                side: selected == module ? const BorderSide(color: Color(0xff26866f), width: 2) : BorderSide.none),
              title: Text(module.title == 'Parts Requisition' ? 'Parts Requisition Monitoring' : module.title),
              onTap: () { Navigator.pop(context); setState(() => selected = module); }),
        ],
      ])),
      ListTile(leading: const Icon(Icons.logout), title: const Text('Log Out'),
        onTap: () { Navigator.pop(context); confirmLogout(); }),
    ]))),
    body: selected.title == 'Profile' ? ProfilePage(session: widget.session)
      : selected.title == 'Messages' ? MessagingPage(session: widget.session)
      : selected.title == 'Manage Users' ? UserManagementPage(session: widget.session)
      : selected.title == 'Tasks' ? TasksPage(session: widget.session)
      : selected.title == 'Parts Requisition' ? RequisitionsPage(session: widget.session)
      : selected.title == 'Maintenance Priority Sorting' ? PriorityPage(session: widget.session)
      : selected.title == 'Maintenance Logs' ? MaintenanceLogsPage(session: widget.session)
      : selected.title == 'Activity Logs' ? ActivityLogsPage(session: widget.session)
      : selected.title == 'Flight Logs' ? FlightLogsPage(session: widget.session)
      : selected.title == 'Pre-Flight Inspection' ? FlightInspectionsPage(session: widget.session, kind: 'pre')
      : selected.title == 'Post-Flight Inspection' ? FlightInspectionsPage(session: widget.session, kind: 'post')
      : selected.title == 'Parts Lifespan Monitoring' ? PartsMonitoringPage(session: widget.session)
      : selected.title == 'Maintenance Tracking' ? MaintenanceTrackingPage(session: widget.session)
      : selected.title == 'Mechanics' ? MechanicsPage(session: widget.session)
      : selected.title == 'Reports and Analytics' ? ReportsPage(session: widget.session)
      : ModuleList(key: ValueKey(selected.title), session: widget.session, module: selected),
    floatingActionButton: selected.title != 'Messages' && allowed.any((module) => module.title == 'Messages')
      ? FloatingActionButton(child: const Icon(Icons.message_outlined), onPressed: () => setState(
          () => selected = allowed.firstWhere((module) => module.title == 'Messages'))) : null,
  ));
}

class ModuleList extends StatefulWidget {
  const ModuleList({super.key, required this.session, required this.module});
  final AirmsSession session;
  final Module module;
  @override State<ModuleList> createState() => _ModuleListState();
}
class _ModuleListState extends State<ModuleList> {
  List<dynamic> records = [];
  String query = '', error = '';
  bool loading = true;
  Timer? timer;
  @override void initState() {
    super.initState(); load();
    if (widget.module.title == 'Messages') timer = Timer.periodic(const Duration(seconds: 15), (_) => load(silent: true));
  }
  @override void dispose() { timer?.cancel(); super.dispose(); }
  Future<void> load({bool silent = false}) async {
    if (!silent) setState(() => loading = true);
    try {
      final data = await widget.session.request(widget.module.path);
      final list = data is List ? data : data is Map ?
        (data['data'] is List ? data['data'] : data['records'] is List ? data['records'] :
        data['items'] is List ? data['items'] : data['conversations'] is List ? data['conversations'] :
        data['notifications'] is List ? data['notifications'] : data['logs'] is List ? data['logs'] :
        data['tasks'] is List ? data['tasks'] : <dynamic>[]) : <dynamic>[];
      if (mounted) setState(() { records = list; error = ''; });
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => loading = false); }
  }
  @override Widget build(BuildContext context) {
    final visible = records.where((record) => matchesSearch(query, record)).toList();
    return RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.all(16), children: [
      TextField(decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search',
        border: OutlineInputBorder()), onChanged: (value) => setState(() => query = value)),
      const SizedBox(height: 12),
      if (loading) const Center(child: CircularProgressIndicator()),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      if (!loading && visible.isEmpty && error.isEmpty) const Padding(padding: EdgeInsets.all(32), child: Center(child: Text('No records found'))),
      ...visible.map((record) => _RecordCard(record: record, module: widget.module.title)),
    ]));
  }
}

class _RecordCard extends StatelessWidget {
  const _RecordCard({required this.record, required this.module});
  final dynamic record;
  final String module;
  @override Widget build(BuildContext context) {
    final data = record is Map ? record as Map : {'value': record};
    String value(List<String> keys) {
      for (final key in keys) {
        final current = data[key];
        if (current != null && '$current'.trim().isNotEmpty) return '$current';
      }
      return '';
    }
    final title = value(['title', 'subject', 'name', 'wrsNo', 'aircraft', 'aircraftRegistration', 'tailNumber', 'username', 'firstName', 'value', '_id']);
    final subtitle = value(['status', 'description', 'jobTitle', 'date', 'createdAt', 'updatedAt', 'lastMessage']);
    return Card(child: ListTile(title: Text(title.isEmpty ? module : title),
      subtitle: subtitle.isEmpty ? null : Text(subtitle, maxLines: 2, overflow: TextOverflow.ellipsis),
      trailing: const Icon(Icons.chevron_right),
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => Scaffold(
        appBar: AppBar(title: Text(title.isEmpty ? module : title)),
        body: ListView(padding: const EdgeInsets.all(16), children: data.entries.map<Widget>((entry) => Card(
          child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${entry.key}', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xff26866f))),
            const SizedBox(height: 4), Text('${entry.value}'),
          ])))).toList()),
      )))));
  }
}
