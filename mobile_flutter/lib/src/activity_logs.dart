import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/material.dart';
import 'search.dart';
import 'auth.dart';
import 'pdf_exports.dart';
import 'activity_trend_chart.dart';
import 'date_time.dart';
import 'access.dart';
import 'toast.dart';

const _actionKeywords = <String, List<String>>{
  'export': ['export', 'downloaded', 'printed', 'generated pdf', 'generated document'],
  'notification': ['notification', 'message', 'email'],
  'authentication': ['login', 'log in', 'logged in', 'logout', 'log out', 'logged out', 'signed in', 'signed out', 'session refreshed', 'otp', 'password reset', 'pin reset', 'trusted device', 'security setup', 'activated'],
  'delete': ['deleted', 'removed', 'revoked', 'destroyed', 'erased'],
  'create': ['created', 'added', 'submitted', 'registered'],
  'update': ['updated', 'changed', 'modified', 'edited', 'saved'],
  'view': ['viewed', 'opened', 'read', 'accessed'],
};
const _displayCategories = ['create', 'update', 'delete', 'view', 'export', 'authentication', 'notification', 'other'];

String activityCategory(Map log) {
  final action = '${log['actionMade'] ?? log['action'] ?? ''}'.toLowerCase();
  for (final entry in _actionKeywords.entries) {
    if (entry.value.any(action.contains)) return entry.key;
  }
  return 'other';
}

String activityPlatformLabel(Map log) {
  final device = '${log['devicePlatform'] ?? ''}'.trim().toUpperCase();
  if (device == 'MOBILE_IOS') return 'IOS';
  if (device == 'MOBILE_ANDROID') return 'ANDROID';
  if (device.isNotEmpty) return device.replaceAll('_', ' ');
  return '${log['platform'] ?? 'unknown'}'.trim().toUpperCase();
}

String activityUserName(Map log) {
  final full = '${log['firstName'] ?? ''} ${log['lastName'] ?? ''}'.trim();
  return full.isNotEmpty ? full : '${log['displayName'] ?? 'Unknown'}';
}

bool activityWithinRange(Map log, String days, DateTime now) {
  if (days == 'all') return true;
  final date = DateTime.tryParse('${log['dateTime'] ?? ''}');
  final count = int.tryParse(days);
  return date != null && count != null && !date.isBefore(now.subtract(Duration(days: count)));
}

bool activityMatchesPlatform(Map log, String value) => value == 'all' ||
  '${log['platform'] ?? 'unknown'}'.trim().toUpperCase() == value || activityPlatformLabel(log) == value;

const activityColors = <String, Color>{
  'create': Color(0xff389e0d), 'update': Color(0xff1677ff),
  'delete': Color(0xffcf1322), 'view': Color(0xff13c2c2),
  'export': Color(0xff595959), 'authentication': Color(0xff722ed1),
  'notification': Color(0xfffa8c16), 'other': Color(0xff8c8c8c),
};

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
  http.Client? eventClient;
  StreamSubscription<String>? eventSubscription;
  bool fetching = false;
  Widget filterControl(String selected, Map<String, String> options, ValueChanged<String> onSelect) =>
    Padding(padding: const EdgeInsets.only(right: 12), child: PopupMenuButton<String>(
      onSelected: onSelect,
      itemBuilder: (_) => options.entries.map((entry) => PopupMenuItem<String>(value: entry.key,
        child: Text(entry.value, style: const TextStyle(fontSize: 12)))).toList(),
      child: Container(width: 172, height: 48, padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(color: Colors.white, border: Border.all(color: const Color(0xffd0d5dd)),
          borderRadius: BorderRadius.circular(10)),
        child: Row(children: [const Icon(Icons.tune, size: 16, color: Color(0xff26866f)),
          const SizedBox(width: 6), Expanded(child: Text(options[selected] ?? selected,
            maxLines: 1, overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
          const Icon(Icons.keyboard_arrow_down, size: 22)]))));
  @override void initState() {
    super.initState();
    load();
    _listenForChanges();
  }
  Future<void> _listenForChanges() async {
    final client = http.Client();
    eventClient = client;
    try {
      final request = http.Request('GET', Uri.parse('$apiBase/api/events/stream'));
      final response = await client.send(request);
      if (response.statusCode >= 400) return;
      eventSubscription = response.stream.transform(utf8.decoder).transform(const LineSplitter()).listen((line) {
        if (line.trim() == 'event: data-changed' && mounted) load(silent: true);
      });
    } catch (_) { /* Event streaming may be unavailable on a device. */ }
  }
  @override void dispose() { eventSubscription?.cancel(); eventClient?.close(); super.dispose(); }
  Future<void> load({bool silent = false}) async {
    if (fetching) return;
    fetching = true;
    final requestedDays = days;
    if (!silent) setState(() => loading = true);
    try {
      final query = <String, String>{'page': '1', 'limit': '1000'};
      if (days != 'all') {
        final count = int.parse(days);
        query['startDate'] = DateTime.now().subtract(Duration(days: count)).toUtc().toIso8601String();
        query['endDate'] = DateTime.now().toUtc().toIso8601String();
      }
      final data = await widget.session.request('/api/logs/getAllUserLogs?${Uri(queryParameters: query).query}');
      if (mounted) setState(() { logs = (data['data'] as List? ?? []).whereType<Map>().toList(); error = ''; if (!silent) page = 0; });
    } catch (e) { if (mounted) AirmsToast.show(e); }
    finally {
      fetching = false;
      if (mounted && !silent) setState(() => loading = false);
      if (mounted && days != requestedDays) load(silent: true);
    }
  }
  Future<void> exportPdf(List<Map> filtered) async {
    setState(() { exporting = true; error = ''; });
    try {
      String captured(Object? value) => '${value ?? ''}'.trim().isEmpty ? 'Not captured' : '$value';
      await shareAirmsPdf(title: 'Activity Logs Report', fileName: 'AirMS_Activity_Logs.pdf',
        columns: const ['Date / Time', 'Performed By', 'Action', 'Platform', 'Device Model', 'Base', 'Location', 'Coordinates'],
        rows: filtered.map((log) => [
          formatAirmsDateTime(log['dateTime'], fallback: 'N/A'),
          activityUserName(log),
          '${log['actionMade'] ?? log['action'] ?? 'N/A'}', activityPlatformLabel(log),
          captured(log['deviceModel']), captured(baseLabel(log['base'])),
          captured(log['locationText']),
          log['locationLatitude'] == null || log['locationLongitude'] == null ? 'Not captured' : '${(num.tryParse('${log['locationLatitude']}') ?? 0).toStringAsFixed(6)}, ${(num.tryParse('${log['locationLongitude']}') ?? 0).toStringAsFixed(6)}',
        ]).toList());
    } catch (e) { if (mounted) AirmsToast.show(e); }
    finally { if (mounted) setState(() => exporting = false); }
  }
  @override Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator(color: Color(0xff26866f)));
    final platforms = <String>{'WEB', 'MOBILE', ...logs.expand((log) => [
      '${log['platform'] ?? ''}'.trim().toUpperCase(), activityPlatformLabel(log),
    ])}..remove('');
    final filtered = logs.where((log) {
      if (!activityWithinRange(log, days, DateTime.now())) return false;
      if (action != 'all' && activityCategory(log) != action) return false;
      if (scope == 'platform' && !activityMatchesPlatform(log, platform)) return false;
      return matchesSearch(search, log);
    }).toList();
    if (page > 0 && page * 10 >= filtered.length) page = 0;
    final visible = filtered.skip(page * 10).take(10).toList();
    final counts = <String, int>{for (final key in _displayCategories) key: 0};
    final daily = <String, Map<String, int>>{};
    final users = <String, int>{};
    final modules = <String, int>{};
    for (final log in filtered) {
      counts.update(activityCategory(log), (value) => value + 1);
      final parsed = DateTime.tryParse('${log['dateTime'] ?? ''}');
      if (parsed != null) {
        final day = parsed.toUtc().toIso8601String().substring(0, 10);
        daily.putIfAbsent(day, () => {}).update(activityCategory(log), (value) => value + 1, ifAbsent: () => 1);
      }
      final user = activityUserName(log);
      users.update(user, (value) => value + 1, ifAbsent: () => 1);
      final text = '${log['actionMade'] ?? log['action'] ?? ''}'.toLowerCase();
      final module = text.contains('task') ? 'tasks' : text.contains('flight') ? 'flight logs' :
        text.contains('inspection') ? 'inspections' : text.contains('requisition') ? 'requisitions' :
        text.contains('user') ? 'users' : 'other';
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
    return RefreshIndicator(onRefresh: () => load(silent: true), child: ListView(padding: const EdgeInsets.fromLTRB(10, 10, 10, 110), children: [
      TextField(decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search logs',
        border: OutlineInputBorder()), onChanged: (value) => setState(() { search = value; page = 0; })),
      const SizedBox(height: 10),
      SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: [
        filterControl(action, {'all': 'All Actions', for (final key in _displayCategories)
          key: '${key[0].toUpperCase()}${key.substring(1)}'},
          (value) => setState(() { action = value; page = 0; })),
        filterControl(days, const {'7': 'Last 7 days', '30': 'Last 30 days'},
          (value) { setState(() { days = value; page = 0; }); load(silent: true); }),
        filterControl(scope, const {'all': 'All Scope', 'platform': 'Platform'},
          (value) => setState(() { scope = value; platform = 'all'; page = 0; })),
        if (scope == 'platform') filterControl(platform,
          {'all': 'All Platform', for (final value in (platforms.toList()..sort())) value: value},
          (value) => setState(() { platform = value; page = 0; })),
      ])),
      if (canExportModule(resolveUserRole(widget.session.user), 'activityLogs'))
        Padding(padding: const EdgeInsets.only(top: 10, bottom: 10), child: SizedBox(height: 46, width: double.infinity,
          child: FilledButton.icon(onPressed: exporting || filtered.isEmpty ? null : () => exportPdf(filtered),
            style: FilledButton.styleFrom(backgroundColor: const Color(0xff26866f),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
            icon: exporting ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) :
              const Icon(Icons.picture_as_pdf_outlined, size: 18),
            label: Text(exporting ? 'Exporting...' : 'Export PDF')))),
      Card(color: Colors.white, child: Padding(padding: const EdgeInsets.all(10), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Activity Trends', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        SizedBox(height: 230, child: ActivityTrendChart(days: chartDays, values: daily, selected: action, showLegend: false)),
        const SizedBox(height: 8),
        Wrap(spacing: 10, runSpacing: 5, children: counts.entries.where((entry) => action == 'all' || entry.key == action).map((entry) =>
          Row(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.circle, size: 7, color: activityColors[entry.key]),
            const SizedBox(width: 5), Text('${entry.key[0].toUpperCase()}${entry.key.substring(1)} (${entry.value})', style: const TextStyle(fontSize: 10))])).toList()),
        Text('Top Users', style: Theme.of(context).textTheme.titleSmall),
        for (final item in topUsers.take(3)) Text('${item.key}: ${item.value}'),
        Text('Top Modules', style: Theme.of(context).textTheme.titleSmall),
        for (final item in topModules.take(3)) Text('${item.key}: ${item.value}'),
      ]))),
      if (!loading && filtered.isEmpty) const Padding(padding: EdgeInsets.all(40), child: Center(child: Column(children: [Icon(Icons.history, size: 44), SizedBox(height: 8), Text('No logs found')]))),
      for (final log in visible) Card(color: Colors.white, margin: const EdgeInsets.only(bottom: 12), child: Padding(padding: const EdgeInsets.all(12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [Expanded(child: Text('${log['actionMade'] ?? log['action'] ?? 'N/A'}',
              style: const TextStyle(fontWeight: FontWeight.bold))),
              Chip(label: Text(activityCategory(log).toUpperCase()),
                backgroundColor: (activityColors[activityCategory(log)] ?? Colors.grey).withValues(alpha: .15))]),
            Text('Performed by: ${activityUserName(log)}'),
            Text(formatAirmsDateTime(log['dateTime'], fallback: 'N/A')),
            Wrap(spacing: 6, children: [
              Chip(label: Text(activityPlatformLabel(log))),
              if ('${log['deviceModel'] ?? ''}'.isNotEmpty) Chip(label: Text('Device: ${log['deviceModel']}')),
              if (baseLabel(log['base']).isNotEmpty) Chip(label: Text('Base: ${baseLabel(log['base'])}')),
            ]),
            if ('${log['locationText'] ?? ''}'.isNotEmpty) Text('Logging in from: ${log['locationText']}'),
            if (log['locationLatitude'] != null && log['locationLongitude'] != null)
              Text('Latitude and longitude coordinates: ${(num.tryParse('${log['locationLatitude']}') ?? 0).toStringAsFixed(6)}, ${(num.tryParse('${log['locationLongitude']}') ?? 0).toStringAsFixed(6)}'),
          ]))),
      if (filtered.isNotEmpty) Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        TextButton(onPressed: page > 0 ? () => setState(() => page--) : null, child: const Text('Prev')),
        Text('Page ${page + 1} of ${(filtered.length / 10).ceil()}'),
        TextButton(onPressed: (page + 1) * 10 < filtered.length ? () => setState(() => page++) : null, child: const Text('Next')),
      ]),
    ]));
  }
}
