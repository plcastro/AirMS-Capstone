import 'package:flutter/material.dart';
import 'auth.dart';
import 'pdf_exports.dart';
import 'activity_trend_chart.dart';

const _actionKeywords = <String, List<String>>{
  'export': ['export', 'downloaded', 'printed', 'generated pdf'],
  'notification': ['notification', 'message', 'email'],
  'authentication': ['login', 'log in', 'logout', 'log out', 'signed in', 'signed out', 'otp', 'password reset', 'pin reset', 'trusted device', 'activated'],
  'delete': ['deleted', 'removed', 'revoked', 'destroyed', 'erased'],
  'create': ['created', 'added', 'submitted', 'registered'],
  'update': ['updated', 'changed', 'modified', 'edited', 'saved'],
  'view': ['viewed', 'opened', 'read', 'accessed'],
};

String _category(Map log) {
  final action = '${log['actionMade'] ?? log['action'] ?? ''}'.toLowerCase();
  for (final entry in _actionKeywords.entries) {
    if (entry.value.any(action.contains)) return entry.key;
  }
  return 'other';
}

class ActivityLogsPage extends StatefulWidget {
  const ActivityLogsPage({super.key, required this.session});
  final AirmsSession session;
  @override State<ActivityLogsPage> createState() => _ActivityLogsPageState();
}
class _ActivityLogsPageState extends State<ActivityLogsPage> {
  List<Map> logs = [];
  String search = '', days = '30', action = 'all', scope = 'all', platform = 'all', error = '';
  int page = 0;
  bool loading = true, exporting = false;
  @override void initState() { super.initState(); load(); }
  Future<void> load() async {
    setState(() => loading = true);
    try {
      final query = <String, String>{'page': '1', 'limit': '1000'};
      if (days != 'all') {
        final count = int.parse(days);
        query['startDate'] = DateTime.now().subtract(Duration(days: count)).toUtc().toIso8601String();
        query['endDate'] = DateTime.now().toUtc().toIso8601String();
      }
      final data = await widget.session.request('/api/logs/getAllUserLogs?${Uri(queryParameters: query).query}');
      if (mounted) setState(() { logs = (data['data'] as List? ?? []).whereType<Map>().toList(); error = ''; page = 0; });
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => loading = false); }
  }
  Future<void> exportPdf(List<Map> filtered) async {
    setState(() { exporting = true; error = ''; });
    try {
      await shareAirmsPdf(title: 'Activity Logs Report', fileName: 'AirMS_Activity_Logs.pdf',
        subtitle: '${filtered.length} records',
        columns: const ['Date / Time', 'Performed By', 'Action', 'Platform', 'Device', 'Base', 'Location', 'Coordinates'],
        rows: filtered.map((log) => [
          '${log['dateTime'] ?? ''}', '${log['firstName'] ?? ''} ${log['lastName'] ?? ''}'.trim(),
          '${log['actionMade'] ?? log['action'] ?? ''}', '${log['devicePlatform'] ?? log['platform'] ?? ''}',
          '${log['deviceModel'] ?? ''}', '${log['base'] ?? ''}', '${log['locationText'] ?? ''}',
          log['locationLatitude'] == null || log['locationLongitude'] == null ? '' : '${log['locationLatitude']}, ${log['locationLongitude']}',
        ]).toList());
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => exporting = false); }
  }
  @override Widget build(BuildContext context) {
    final platforms = <String>{'WEB', 'MOBILE', ...logs.expand((log) => [
      '${log['platform'] ?? ''}'.toUpperCase(), '${log['devicePlatform'] ?? ''}'.toUpperCase(),
    ])}..remove('');
    final filtered = logs.where((log) {
      if (action != 'all' && _category(log) != action) return false;
      if (scope == 'platform' && platform != 'all' && '${log['platform'] ?? ''}'.toUpperCase() != platform &&
          '${log['devicePlatform'] ?? ''}'.toUpperCase() != platform) {
        return false;
      }
      return '$log'.toLowerCase().contains(search.toLowerCase());
    }).toList();
    final visible = filtered.skip(page * 10).take(10).toList();
    final counts = <String, int>{for (final key in [..._actionKeywords.keys, 'other']) key: 0};
    final daily = <String, Map<String, int>>{};
    final users = <String, int>{};
    final modules = <String, int>{};
    for (final log in filtered) {
      counts.update(_category(log), (value) => value + 1);
      final parsed = DateTime.tryParse('${log['dateTime'] ?? ''}');
      if (parsed != null) {
        final day = parsed.toLocal().toIso8601String().substring(0, 10);
        daily.putIfAbsent(day, () => {}).update(_category(log), (value) => value + 1, ifAbsent: () => 1);
      }
      final user = '${log['firstName'] ?? ''} ${log['lastName'] ?? ''}'.trim();
      users.update(user.isEmpty ? 'Unknown' : user, (value) => value + 1, ifAbsent: () => 1);
      final text = '${log['actionMade'] ?? log['action'] ?? ''}'.toLowerCase();
      final module = text.contains('task') ? 'Tasks' : text.contains('flight') ? 'Flight logs' :
        text.contains('inspection') ? 'Inspections' : text.contains('requisition') ? 'Requisitions' :
        text.contains('user') ? 'Users' : 'Other';
      modules.update(module, (value) => value + 1, ifAbsent: () => 1);
    }
    final topUsers = users.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    final topModules = modules.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    final today = DateTime.now();
    final start = days == 'all' && daily.isNotEmpty ? DateTime.parse((daily.keys.toList()..sort()).first) :
      DateTime(today.year, today.month, today.day).subtract(Duration(days: (int.tryParse(days) ?? 7) - 1));
    final chartDays = <String>[];
    for (var date = start; !date.isAfter(today); date = date.add(const Duration(days: 1))) {
      chartDays.add(date.toIso8601String().substring(0, 10));
    }
    return RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.all(16), children: [
      TextField(decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search activity logs',
        border: OutlineInputBorder()), onChanged: (value) => setState(() { search = value; page = 0; })),
      Wrap(spacing: 8, children: [
        DropdownButton<String>(value: days, items: ['7', '30', 'all'].map((value) => DropdownMenuItem(value: value,
          child: Text(value == 'all' ? 'All dates' : 'Last $value days'))).toList(),
          onChanged: (value) { setState(() => days = value ?? '30'); load(); }),
        DropdownButton<String>(value: action, items: ['all', ..._actionKeywords.keys, 'other'].map((value) =>
          DropdownMenuItem(value: value, child: Text(value == 'all' ? 'All actions' : value))).toList(),
          onChanged: (value) => setState(() { action = value ?? 'all'; page = 0; })),
        DropdownButton<String>(value: scope, items: ['all', 'platform'].map((value) =>
          DropdownMenuItem(value: value, child: Text(value == 'all' ? 'All scope' : 'Platform'))).toList(),
          onChanged: (value) => setState(() { scope = value ?? 'all'; platform = 'all'; page = 0; })),
        if (scope == 'platform') DropdownButton<String>(value: platform, items: ['all', ...(platforms.toList()..sort())].map((value) =>
          DropdownMenuItem(value: value, child: Text(value == 'all' ? 'All platforms' : value))).toList(),
          onChanged: (value) => setState(() { platform = value ?? 'all'; page = 0; })),
      ]),
      Row(children: [Chip(label: Text('Total: ${filtered.length}')), const SizedBox(width: 8),
        Chip(label: Text('Users: ${users.length}'))]),
      if ('${widget.session.user?['jobTitle'] ?? ''}'.toLowerCase().trim() == 'admin staff')
        OutlinedButton.icon(onPressed: loading || exporting || filtered.isEmpty ? null : () => exportPdf(filtered),
          icon: const Icon(Icons.picture_as_pdf_outlined), label: Text(exporting ? 'Exporting...' : 'Export PDF')),
      Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Activity Trends', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        ActivityTrendChart(days: chartDays, values: daily, selected: action),
        if (daily.isEmpty) const Text('No activity in this range'),
        const SizedBox(height: 8),
        Wrap(spacing: 6, runSpacing: 4, children: counts.entries.where((entry) => entry.value > 0).map((entry) =>
          Chip(label: Text('${entry.key}: ${entry.value}'))).toList()),
        Text('Top Users', style: Theme.of(context).textTheme.titleSmall),
        for (final item in topUsers.take(3)) Text('${item.key}: ${item.value}'),
        Text('Top Modules', style: Theme.of(context).textTheme.titleSmall),
        for (final item in topModules.take(3)) Text('${item.key}: ${item.value}'),
      ]))),
      if (loading) const LinearProgressIndicator(),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      if (!loading && filtered.isEmpty) const Center(child: Text('No activity logs found')),
      for (final log in visible) Card(child: ListTile(
        title: Text('${log['actionMade'] ?? log['action'] ?? 'N/A'}', style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text('${log['firstName'] ?? ''} ${log['lastName'] ?? ''} · ${log['dateTime'] ?? ''}\n${log['devicePlatform'] ?? log['platform'] ?? ''} · ${log['base'] ?? ''}'),
        isThreeLine: true, onTap: () => showModalBottomSheet(context: context, isScrollControlled: true,
          builder: (_) => SizedBox(height: MediaQuery.sizeOf(context).height * .65,
            child: ListView(children: log.entries.map((entry) => ListTile(title: Text('${entry.key}'),
              subtitle: Text('${entry.value ?? ''}'))).toList()))),
      )),
      if (filtered.length > 10) Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        TextButton(onPressed: page > 0 ? () => setState(() => page--) : null, child: const Text('Previous')),
        Text('Page ${page + 1} of ${(filtered.length / 10).ceil()}'),
        TextButton(onPressed: (page + 1) * 10 < filtered.length ? () => setState(() => page++) : null, child: const Text('Next')),
      ]),
    ]));
  }
}
