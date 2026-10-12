import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'auth.dart';
import 'flight_logs.dart';
import 'file_exports.dart';
import 'pdf_exports.dart';

const reportSources = <String, String>{
  'Tasks': '/api/tasks/getAll',
  'Parts Monitoring': '/api/parts-monitoring?page=1&limit=1000',
  'Flight Logs': '/api/flightlogs?page=1&limit=500&sortBy=date&sortOrder=desc',
  'Pre-Flight Inspections': '/api/pre-flight/getAllPreInspection',
  'Post-Flight Inspections': '/api/post-flight/getAllPostInspection',
  'Parts Requisitions': '/api/parts-requisition/get-all-requisition',
};

Map<String, int> reportCounts(List<Map<String, dynamic>> rows, String Function(Map<String, dynamic>) label,
    {int limit = 0}) {
  final result = <String, int>{};
  for (final row in rows) {
    final value = label(row).trim();
    if (value.isEmpty || {'unknown', 'n/a', 'na', 'unassigned', 'all', 'overall', 'total', 'totals'}
        .contains(value.toLowerCase())) {
      continue;
    }
    result.update(value, (count) => count + 1, ifAbsent: () => 1);
  }
  final entries = result.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
  return {for (final entry in limit > 0 ? entries.take(limit) : entries) entry.key: entry.value};
}

String _reportBase(dynamic value) => flightText(value).trim().toUpperCase();
bool _knownReportBase(dynamic value) => !{'', 'UNKNOWN', 'N/A', 'NA', 'UNASSIGNED'}
    .contains(_reportBase(value));
bool _reportCompleted(Map<String, dynamic> task) {
  final status = flightText(task['status']).trim().toLowerCase();
  return {'completed', 'turned in', 'approved'}.contains(status) ||
      task['isApproved'] == true || task['completedAt'] != null;
}
bool _reportTaskMentions(Map<String, dynamic> task, List<String> words) {
  final details = [task['status'], task['title'], task['findings'], task['defects'],
    task['maintenanceType'], flightMap(task['summary'])['remarks']]
      .map(flightText).join(' ').toLowerCase();
  return words.any(details.contains);
}
List<Map<String, dynamic>> _reportBaseRows(Map<String, dynamic> analytics,
    List<Map<String, dynamic>> tasks, Map<String, String> aircraftBases, String search) {
  final serverRows = (analytics['byBase'] as List? ?? []).map(flightMap)
      .where((row) => _knownReportBase(row['base'])).toList();
  if (search.trim().isEmpty && serverRows.isNotEmpty) return serverRows;
  final counts = <String, List<int>>{};
  for (final task in tasks) {
    final base = [task['base'], task['locationBase'], task['assignedBase'],
      task['stationBase'], aircraftBases[_reportBase(task['aircraft'])]]
        .map(_reportBase).firstWhere(_knownReportBase, orElse: () => '');
    if (base.isEmpty) continue;
    final count = counts.putIfAbsent(base, () => [0, 0]);
    if (_reportTaskMentions(task, const ['damage', 'damaged', 'defect', 'crack', 'fault', 'issue'])) count[0]++;
    if (_reportCompleted(task) || _reportTaskMentions(task,
        const ['repair', 'repaired', 'rectified', 'fixed', 'resolved'])) {
      count[1]++;
    }
  }
  final rows = counts.entries.map((entry) => <String, dynamic>{
    'base': entry.key, 'damagedCount': entry.value[0], 'repairedCount': entry.value[1],
  }).toList()..sort((a, b) => ((b['damagedCount'] as int) + (b['repairedCount'] as int))
      .compareTo((a['damagedCount'] as int) + (a['repairedCount'] as int)));
  return rows.take(10).toList();
}

class _ReportPanel extends StatelessWidget {
  const _ReportPanel(this.title, this.subtitle, this.child);
  final String title, subtitle;
  final Widget child;
  @override Widget build(BuildContext context) => Card(child: Padding(padding: const EdgeInsets.all(12),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: Theme.of(context).textTheme.titleMedium), Text(subtitle,
        style: Theme.of(context).textTheme.bodySmall), const SizedBox(height: 8), child,
    ])));
}

class ReportsPage extends StatefulWidget {
  const ReportsPage({super.key, required this.session});
  final AirmsSession session;
  @override State<ReportsPage> createState() => _ReportsPageState();
}
class _ReportsPageState extends State<ReportsPage> {
  final data = <String, List<Map<String, dynamic>>>{};
  Map<String, dynamic> baseAnalytics = {};
  Map<String, String> aircraftBases = {};
  String selected = 'Tasks', search = '', error = '';
  String taskKpi = 'completed';
  bool loading = true;
  bool exporting = false;
  @override void initState() { super.initState(); load(); }
  Future<void> load() async {
    setState(() => loading = true);
    final results = await Future.wait(reportSources.entries.map((entry) async {
      try {
        final response = await widget.session.request(entry.value);
        final raw = response['data'];
        final list = raw is List ? raw : raw is Map ? (raw['data'] ?? raw['records'] ?? raw['items']) : null;
        return MapEntry(entry.key, (list is List ? list : <dynamic>[]).map(flightMap).toList());
      } catch (_) { return MapEntry(entry.key, <Map<String, dynamic>>[]); }
    }));
    Map<String, dynamic> analytics = {};
    try {
      final response = await widget.session.request('/api/tasks/analytics/base-maintenance');
      analytics = flightMap(response['data']);
    } catch (_) {}
    final bases = <String, String>{};
    try {
      final response = await widget.session.request('/api/aircraft/aircraft-with-bases');
      final raw = response['data'];
      final aircraft = raw is List ? raw : raw is Map ?
          (raw['data'] ?? raw['records'] ?? raw['items']) : null;
      for (final item in aircraft is List ? aircraft : <dynamic>[]) {
        final row = flightMap(item);
        final tail = _reportBase(row['tailNum'] ?? row['aircraft']);
        final base = _reportBase(row['base']);
        if (tail.isNotEmpty && _knownReportBase(base)) bases[tail] = base;
      }
    } catch (_) {}
    if (mounted) {
      setState(() { data..clear()..addEntries(results); baseAnalytics = analytics;
        aircraftBases = bases; loading = false; error = ''; });
    }
  }
  List<Map<String, dynamic>> reportSections() {
    final query = search.trim().toLowerCase();
    List<Map<String, dynamic>> rows(String key) => (data[key] ?? [])
        .where((row) => '$row'.toLowerCase().contains(query)).toList();
    Map<String, int> counts(List<Map<String, dynamic>> source,
        String Function(Map<String, dynamic>) label) => reportCounts(source, label);
    Map<String, dynamic> countSection(String title, Map<String, int> values) => {
      'title': title, 'columns': ['Label', 'Count'],
      'rows': values.entries.map((entry) => [entry.key, entry.value]).toList(),
    };
    final tasks = rows('Tasks');
    final flights = rows('Flight Logs');
    final pre = rows('Pre-Flight Inspections');
    final post = rows('Post-Flight Inspections');
    final requisitions = rows('Parts Requisitions');
    final monitored = rows('Parts Monitoring');
    final components = <Map<String, dynamic>>[];
    for (final aircraft in monitored) {
      for (final part in aircraft['parts'] as List? ?? []) {
        final item = flightMap(part);
        if (item['rowType'] == 'header' || flightText(item['componentName']).isEmpty) continue;
        components.add({...item, 'aircraft': aircraft['aircraft']});
      }
    }
    final dueComponents = components.where((part) {
      final days = num.tryParse(flightText(part['daysRemaining']));
      final hours = num.tryParse(flightText(part['timeRemaining']));
      return flightText(part['due']).toLowerCase().contains('due') ||
          (days != null && days <= 30) || (hours != null && hours <= 50);
    }).toList();
    final bases = _reportBaseRows(baseAnalytics, tasks, aircraftBases, query);
    final now = DateTime.now();
    final dueSoon = tasks.where((task) {
      final due = DateTime.tryParse(flightText(task['dueDate'] ?? task['endDateTime'] ?? task['dateRectified']));
      return !_reportCompleted(task) && due != null && !due.isBefore(now) &&
          !due.isAfter(now.add(const Duration(days: 3)));
    }).length;
    final overdue = tasks.where((task) {
      final due = DateTime.tryParse(flightText(task['dueDate'] ?? task['endDateTime'] ?? task['dateRectified']));
      return !_reportCompleted(task) && due != null && due.isBefore(now);
    }).length;
    final requisitionItems = requisitions.expand((record) =>
        (record['items'] as List? ?? []).map(flightMap)).toList();
    String month(Map<String, dynamic> row) {
      final date = DateTime.tryParse(flightText(row['date'] ?? row['dateRequested'] ??
          row['dateAdded'] ?? row['createdAt'] ?? row['updatedAt']));
      if (date == null) return 'No date';
      const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${names[date.month - 1]} ${date.year}';
    }
    return [
      {'title': 'Overview Statistics', 'columns': ['Metric', 'Value'], 'rows': [
        ['Total Tasks', tasks.length], ['Completed Tasks', tasks.where(_reportCompleted).length],
        ['Due Soon Tasks', dueSoon], ['Overdue Tasks', overdue],
        ['Parts Monitoring Aircraft', monitored.length], ['Tracked Components', components.length],
        ['Due / Due Soon Components', dueComponents.length], ['Flight Logs', flights.length],
        ['Pre-Flight Inspections', pre.length], ['Post-Flight Inspections', post.length],
        ['Parts Requisitions', requisitions.length], ['Requested Line Items', requisitionItems.length],
      ]},
      {'title': 'Base Damage and Repair Counts',
        'columns': ['Base', 'Damage Reports', 'Repaired Aircraft'],
        'rows': bases.map((row) => [row['base'], row['damagedCount'], row['repairedCount']]).toList()},
      countSection('Task Status Counts', counts(tasks, (row) => flightText(row['status']).replaceAll('_', ' '))),
      countSection('Task Priority Counts', counts(tasks, (row) => flightText(row['priority']).isEmpty ? 'Normal' : flightText(row['priority']))),
      countSection('Tasks by Aircraft', counts(tasks, (row) => flightText(row['aircraft']))),
      {'title': 'Task Details', 'columns': ['Aircraft', 'Task', 'Assigned Mechanic', 'Type',
        'Due Date', 'Completed Date', 'Priority', 'Status'],
        'rows': tasks.map((task) => [task['aircraft'] ?? 'N/A',
          task['title'] ?? flightMap(task['summary'])['category'] ?? 'Untitled task',
          task['assignedToName'] ?? task['assignedMechanic'] ?? 'Unassigned',
          task['maintenanceType'] ?? 'N/A', task['dueDate'] ?? task['endDateTime'] ?? task['dateRectified'] ?? '',
          task['approvedAt'] ?? task['completedAt'] ?? task['dateRectified'] ?? task['updatedAt'] ?? '',
          task['priority'] ?? 'Normal', task['status'] ?? 'Pending']).toList()},
      countSection('Flight Logs by Aircraft', counts(flights, (row) => flightText(row['rpc'] ?? row['aircraft']))),
      countSection('Flight Log Status Counts', counts(flights, (row) => flightText(row['status']).replaceAll('_', ' '))),
      countSection('Flight Logs by Month', counts(flights, month)),
      countSection('Pre-Flight Inspection Status Counts', counts(pre, (row) => flightText(row['status']).replaceAll('_', ' '))),
      countSection('Post-Flight Inspection Status Counts', counts(post, (row) => flightText(row['status']).replaceAll('_', ' '))),
      countSection('Parts Requisition Status Counts', counts(requisitions, (row) => flightText(row['status']).replaceAll('_', ' '))),
      countSection('Parts Requisition Item Stock Counts', counts(requisitionItems,
        (row) => flightText(row['stockStatus']).replaceAll('_', ' '))),
      countSection('Component Due Statistics', counts(dueComponents, (row) => flightText(row['aircraft']))),
    ];
  }
  Future<void> exportExcel() async {
    setState(() { exporting = true; error = ''; });
    try {
      await openAuthenticatedExport(widget.session, '/api/reports/export-excel',
        'AirMS_Reports_${DateTime.now().toIso8601String().split('T').first}.xlsx',
        method: 'POST', body: {'title': 'Reports and Analytics', 'sections': reportSections()});
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => exporting = false); }
  }
  Future<void> exportPdf() async {
    setState(() { exporting = true; error = ''; });
    try {
      final sections = reportSections();
      await shareAirmsPdf(title: 'Reports and Analytics',
        fileName: 'AirMS_Reports_${DateTime.now().toIso8601String().split('T').first}.pdf',
        subtitle: '${sections.length} report sections',
        columns: const ['Section', 'Metric', 'Value'],
        rows: [for (final section in sections)
          for (final row in section['rows'] as List)
            [flightText(section['title']),
              row is List && row.isNotEmpty ? flightText(row.first) : '',
              row is List && row.length > 1 ? row.skip(1).map(flightText).join(' | ') : '']]);
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => exporting = false); }
  }
  @override Widget build(BuildContext context) {
    final tasks = data['Tasks'] ?? [];
    final query = search.trim().toLowerCase();
    List<Map<String, dynamic>> filtered(String key) => (data[key] ?? [])
        .where((row) => '$row'.toLowerCase().contains(query)).toList();
    final filteredTasks = tasks.where((task) => '$task'.toLowerCase().contains(query)).toList();
    final completed = filteredTasks.where(_reportCompleted).length;
    final now = DateTime.now();
    final dueSoon = filteredTasks.where((task) {
      final due = DateTime.tryParse(flightText(task['dueDate'] ?? task['endDateTime']));
      return due != null && !due.isBefore(now) && due.isBefore(now.add(const Duration(days: 3))) &&
        !_reportCompleted(task);
    }).length;
    final overdue = filteredTasks.where((task) {
      final due = DateTime.tryParse(flightText(task['dueDate'] ?? task['endDateTime']));
      return due != null && due.isBefore(now) &&
        !_reportCompleted(task);
    }).length;
    final drilldown = filteredTasks.where((task) {
      final due = DateTime.tryParse(flightText(task['dueDate'] ?? task['endDateTime']));
      final done = _reportCompleted(task);
      return switch (taskKpi) {
        'dueSoon' => due != null && !due.isBefore(now) && due.isBefore(now.add(const Duration(days: 3))) && !done,
        'overdue' => due != null && due.isBefore(now) && !done,
        _ => done,
      };
    }).toList();
    final byBase = _reportBaseRows(baseAnalytics, filteredTasks, aircraftBases, query);
    final taskStatuses = <String, int>{};
    for (final task in filteredTasks) {
      final status = flightText(task['status']).trim();
      taskStatuses.update(status.isEmpty ? 'Unspecified' : status, (count) => count + 1, ifAbsent: () => 1);
    }
    final maxTaskStatus = taskStatuses.values.fold<int>(0, math.max);
    final maxDamage = byBase.fold<int>(0, (best, row) => math.max(best, (row['damagedCount'] as num?)?.toInt() ?? 0));
    final maxRepair = byBase.fold<int>(0, (best, row) => math.max(best, (row['repairedCount'] as num?)?.toInt() ?? 0));
    final generalRows = <(String, List<Map<String, dynamic>>)>[
      ('Task Assignment', filteredTasks), ('Flight Log', filtered('Flight Logs')),
      ('Pre-Inspection', filtered('Pre-Flight Inspections')),
      ('Post-Inspection', filtered('Post-Flight Inspections')),
      ('Parts Requisition', filtered('Parts Requisitions')),
    ];
    bool doneLike(Map<String, dynamic> item) => ['completed', 'approved', 'released', 'accepted', 'done']
      .any((status) => flightText(item['status']).toLowerCase().contains(status));
    final allRecords = generalRows.fold<int>(0, (sum, row) => sum + row.$2.length);
    final allDone = generalRows.fold<int>(0, (sum, row) => sum + row.$2.where(doneLike).length);
    final trend = <String, int>{};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (final task in filteredTasks) {
      final date = DateTime.tryParse(flightText(task['updatedAt'] ?? task['createdAt'] ?? task['dueDate']));
      final label = date == null ? 'No date' : '${monthNames[date.month - 1]} ${date.year}';
      trend.update(label, (count) => count + 1, ifAbsent: () => 1);
    }
    int trendOrder(String label) {
      final parts = label.split(' ');
      if (parts.length != 2) return 999999;
      final month = monthNames.indexOf(parts[0]);
      final year = int.tryParse(parts[1]);
      return month < 0 || year == null ? 999999 : year * 12 + month;
    }
    final recentTrend = trend.entries.toList()..sort((a, b) => trendOrder(a.key).compareTo(trendOrder(b.key)));
    final componentCounts = <String, int>{};
    for (final record in filtered('Parts Monitoring')) {
      final name = flightText(record['aircraft']).trim().isEmpty ? 'Unknown' : flightText(record['aircraft']);
      final count = (record['parts'] as List? ?? []).where((part) => part is Map &&
        part['rowType'] != 'header' && flightText(part['componentName']).isNotEmpty).length;
      componentCounts.update(name, (value) => value + count, ifAbsent: () => count);
    }
    final visible = (data[selected] ?? []).where((item) => '$item'.toLowerCase().contains(search.toLowerCase())).toList();
    final statusCounts = <String, int>{};
    for (final item in visible) {
      final status = flightText(item['status']).trim();
      statusCounts.update(status.isEmpty ? 'Unspecified' : status, (count) => count + 1, ifAbsent: () => 1);
    }
    final statuses = statusCounts.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    return RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.all(12), children: [
      Text('Reports and Analytics', style: Theme.of(context).textTheme.titleLarge),
      const SizedBox(height: 12),
      TextField(decoration: const InputDecoration(prefixIcon: Icon(Icons.search),
        labelText: 'Search report details', border: OutlineInputBorder()),
        onChanged: (value) => setState(() => search = value)),
      const SizedBox(height: 12),
      Wrap(spacing: 8, runSpacing: 8, children: [
        _Kpi('Tasks', filteredTasks.length), _Kpi('Completed', completed),
        _Kpi('Due soon', dueSoon), _Kpi('Overdue', overdue),
        _Kpi('Flight Logs', filtered('Flight Logs').length),
        _Kpi('Inspections', filtered('Pre-Flight Inspections').length + filtered('Post-Flight Inspections').length),
      ]),
      Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Base damage distribution', style: Theme.of(context).textTheme.titleMedium),
        ReportDonut(values: {for (final row in byBase)
          flightText(row['base']): (row['damagedCount'] as num?)?.toInt() ?? 0}),
      ]))),
      Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Base repaired distribution', style: Theme.of(context).textTheme.titleMedium),
        ReportDonut(values: {for (final row in byBase)
          flightText(row['base']): (row['repairedCount'] as num?)?.toInt() ?? 0}),
      ]))),
      Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Task status distribution', style: Theme.of(context).textTheme.titleMedium),
        for (final entry in taskStatuses.entries) _ReportBar(entry.key, entry.value, maxTaskStatus),
        if (taskStatuses.isEmpty) const Text('No task status data'),
      ]))),
      Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Base damage reports', style: Theme.of(context).textTheme.titleMedium),
        for (final row in byBase) _ReportBar(flightText(row['base']), (row['damagedCount'] as num?)?.toInt() ?? 0, maxDamage),
        if (byBase.isEmpty) const Text('No base damage data'),
      ]))),
      Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Base repaired aircraft', style: Theme.of(context).textTheme.titleMedium),
        for (final row in byBase) _ReportBar(flightText(row['base']), (row['repairedCount'] as num?)?.toInt() ?? 0, maxRepair),
        if (byBase.isEmpty) const Text('No base repair data'),
      ]))),
      _ReportPanel('General Reports', 'Cross-module overview', Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Wrap(spacing: 8, runSpacing: 8, children: [
          Chip(label: Text('All records: $allRecords')), Chip(label: Text('Completed / closed: $allDone')),
          Chip(label: Text('Open / pending: ${allRecords - allDone}')),
        ]),
        for (final row in generalRows) ListTile(dense: true, title: Text(row.$1),
          subtitle: Text('${row.$2.where(doneLike).length} completed of ${row.$2.length}'),
          trailing: Text('${row.$2.isEmpty ? 0 : (row.$2.where(doneLike).length / row.$2.length * 100).round()}%')),
      ])),
      _ReportPanel('Performance Overview', 'Task trend and throughput', Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('${filteredTasks.length} tasks · $completed completed'),
        for (final entry in recentTrend.reversed.take(8).toList().reversed)
          _ReportBar(entry.key, entry.value, trend.values.fold<int>(0, math.max)),
        if (trend.isEmpty) const Text('No task activity to chart'),
      ])),
      _ReportPanel('Maintenance History', 'Status distribution of maintenance tasks',
        ReportDonut(values: reportCounts(filteredTasks, (row) => flightText(row['status']).replaceAll('_', ' ')))),
      _ReportPanel('Maintenance Insights', 'High-level health indicators', ReportDonut(values: {
        'Repaired/Completed': filteredTasks.where((task) => ['repair', 'complete']
          .any((word) => flightText(task['status']).toLowerCase().contains(word))).length,
        'Pending': filteredTasks.where((task) => !flightText(task['status']).toLowerCase().contains('complete')).length,
        'Overdue': overdue,
      })),
      _ReportPanel('Component Analysis', 'Tracked component counts by aircraft', Column(children: [
        for (final entry in (componentCounts.entries.toList()..sort((a, b) => b.value.compareTo(a.value))).take(8))
          _ReportBar(entry.key, entry.value, componentCounts.values.fold<int>(0, math.max)),
        if (componentCounts.isEmpty) const Text('No component data available'),
      ])),
      _ReportPanel('Flight Log Report', 'Flight logs by aircraft', ReportDonut(values: reportCounts(
        filtered('Flight Logs'), (row) => flightText(row['rpc'] ?? row['aircraft']), limit: 6))),
      _ReportPanel('Pre-Inspection Report', 'Inspection status distribution', ReportDonut(values: reportCounts(
        filtered('Pre-Flight Inspections'), (row) => flightText(row['status']).replaceAll('_', ' '), limit: 6))),
      _ReportPanel('Post-Inspection Report', 'Inspection status distribution', ReportDonut(values: reportCounts(
        filtered('Post-Flight Inspections'), (row) => flightText(row['status']).replaceAll('_', ' '), limit: 6))),
      _ReportPanel('Parts Requisition Report', 'Request status distribution', ReportDonut(values: reportCounts(
        filtered('Parts Requisitions'), (row) => flightText(row['status']).replaceAll('_', ' '), limit: 6))),
      Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Task insight drilldown', style: Theme.of(context).textTheme.titleMedium),
        SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: [
          for (final (key, label) in [('completed', 'Completed'), ('dueSoon', 'Due Soon'), ('overdue', 'Overdue')])
            Padding(padding: const EdgeInsets.only(right: 6), child: ChoiceChip(label: Text(label), selected: taskKpi == key,
              onSelected: (_) => setState(() => taskKpi = key))),
        ])),
        for (final task in drilldown.take(10)) ListTile(
          title: Text(flightText(task['title'] ?? task['description'])),
          subtitle: Text('${task['aircraft'] ?? ''} · ${task['dueDate'] ?? task['endDateTime'] ?? ''}'),
          trailing: Text(flightText(task['priority'])),
        ),
        if (drilldown.isEmpty) const Text('No matching tasks'),
      ]))),
      const SizedBox(height: 12),
      DropdownButtonFormField<String>(initialValue: selected, decoration: const InputDecoration(labelText: 'Report', border: OutlineInputBorder()),
        items: reportSources.keys.map((name) => DropdownMenuItem(value: name, child: Text(name))).toList(),
        onChanged: (name) => setState(() => selected = name ?? 'Tasks')),
      const SizedBox(height: 8),
      if (const {'admin staff', 'maintenance manager', 'officer-in-charge'}
          .contains(flightText(widget.session.user?['jobTitle'] ??
            widget.session.user?['access']).trim().toLowerCase())) ...[
        OutlinedButton.icon(onPressed: loading || exporting ? null : exportExcel,
          icon: const Icon(Icons.table_view_outlined), label: Text(exporting ? 'Exporting...' : 'Export Excel')),
        OutlinedButton.icon(onPressed: loading || exporting ? null : exportPdf,
          icon: const Icon(Icons.picture_as_pdf_outlined), label: Text(exporting ? 'Exporting...' : 'Export PDF')),
      ],
      Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('$selected by status', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        for (final item in statuses) Padding(padding: const EdgeInsets.symmetric(vertical: 3), child: Row(children: [
          SizedBox(width: 115, child: Text(item.key, maxLines: 1, overflow: TextOverflow.ellipsis)),
          Expanded(child: LinearProgressIndicator(value: visible.isEmpty ? 0 : item.value / visible.length, minHeight: 9)),
          const SizedBox(width: 8), Text('${item.value}'),
        ])),
        if (statuses.isEmpty) const Text('No records to chart'),
      ]))),
      Padding(padding: const EdgeInsets.symmetric(vertical: 8), child: Text('$selected · ${visible.length} records', style: const TextStyle(fontWeight: FontWeight.bold))),
      if (loading) const Center(child: CircularProgressIndicator()),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      ...visible.map((item) => Card(child: ListTile(
        title: Text(flightText(item['title'] ?? item['controlNo'] ?? item['aircraft'] ?? item['rpc'] ?? item['description'] ?? item['_id'])),
        subtitle: Text('${item['status'] ?? ''} · ${item['date'] ?? item['createdAt'] ?? ''}'),
        trailing: const Icon(Icons.chevron_right), onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => Scaffold(appBar: AppBar(title: Text(selected)), body: ListView(padding: const EdgeInsets.all(12), children: item.entries.map((entry) => Card(child: ListTile(title: Text(entry.key), subtitle: Text('${entry.value}')))).toList())))),
      ))),
      if (!loading && visible.isEmpty) const Center(child: Padding(padding: EdgeInsets.all(24), child: Text('No report records found'))),
    ]));
  }
}
class _Kpi extends StatelessWidget {
  const _Kpi(this.label, this.value);
  final String label;
  final int value;
  @override Widget build(BuildContext context) => SizedBox(width: 155, child: Card(child: Padding(padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('$value', style: Theme.of(context).textTheme.headlineMedium), Text(label)]))));
}
class _ReportBar extends StatelessWidget {
  const _ReportBar(this.label, this.value, this.maximum);
  final String label;
  final int value, maximum;
  @override Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(children: [SizedBox(width: 100, child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis)),
      Expanded(child: LinearProgressIndicator(value: maximum == 0 ? 0 : value / maximum, minHeight: 12,
        borderRadius: BorderRadius.circular(6))),
      const SizedBox(width: 8), Text('$value')]));
}
class ReportDonut extends StatelessWidget {
  const ReportDonut({super.key, required this.values});
  final Map<String, int> values;
  static const palette = <Color>[
    Color(0xff26866f), Color(0xff1890ff), Color(0xfffaad14), Color(0xfff5222d),
    Color(0xff722ed1), Color(0xff13c2c2), Color(0xffeb2f96), Color(0xff52c41a),
  ];
  @override Widget build(BuildContext context) {
    final entries = values.entries.where((entry) => entry.value > 0).toList();
    final total = entries.fold<int>(0, (sum, entry) => sum + entry.value);
    if (total == 0) return const Padding(padding: EdgeInsets.all(20), child: Text('No data available'));
    return Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Column(children: [
      SizedBox(width: 218, height: 218, child: Stack(alignment: Alignment.center, children: [
        CustomPaint(size: const Size(218, 218), painter: _DonutPainter(entries.map((entry) => entry.value).toList())),
        Column(mainAxisSize: MainAxisSize.min, children: [Text('$total', style: Theme.of(context).textTheme.headlineMedium),
          const Text('Total')]),
      ])),
      const SizedBox(height: 12),
      Wrap(spacing: 12, runSpacing: 8, children: [for (var index = 0; index < entries.length; index++)
        Row(mainAxisSize: MainAxisSize.min, children: [Container(width: 11, height: 11,
          decoration: BoxDecoration(color: palette[index % palette.length], shape: BoxShape.circle)),
          const SizedBox(width: 5), Text('${entries[index].key}: ${entries[index].value}')])]),
    ]));
  }
}

class _DonutPainter extends CustomPainter {
  const _DonutPainter(this.values);
  final List<int> values;
  @override void paint(Canvas canvas, Size size) {
    final total = values.fold<int>(0, (sum, value) => sum + value);
    if (total == 0) return;
    final radius = math.min(size.width, size.height) / 2 - 12;
    final rect = Rect.fromCircle(center: size.center(Offset.zero), radius: radius);
    var start = -math.pi / 2;
    for (var index = 0; index < values.length; index++) {
      final sweep = values[index] / total * math.pi * 2;
      canvas.drawArc(rect, start, sweep, false, Paint()
        ..style = PaintingStyle.stroke ..strokeWidth = 28 ..color = ReportDonut.palette[index % ReportDonut.palette.length]);
      start += sweep;
    }
  }
  @override bool shouldRepaint(covariant _DonutPainter oldDelegate) =>
    !identical(values, oldDelegate.values);
}
