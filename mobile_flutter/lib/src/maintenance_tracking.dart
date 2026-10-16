import 'package:flutter/material.dart';
import 'search.dart';
import 'auth.dart';
import 'flight_logs.dart';
import 'tasks.dart';
import 'access.dart';
import 'date_time.dart';
import 'toast.dart';

String inferRectificationInspectionName(Map<String, dynamic> item) {
  final text = [item['issueTitle'], item['component'], item['recommendedAction'],
    ...(item['manualReferences'] as List? ?? [])].where((value) => value != null && '$value'.isNotEmpty)
    .join(' ').toLowerCase();
  for (final pair in const [
    ('tbo', 'TBO Inspection'), ('1500 fh', '1500 FH Inspection'),
    ('1200 fh', '1200 FH Inspection'), ('750 fh', '750 FH Inspection'),
    ('600 fh', '600 FH Inspection'), ('150 fh', '150 FH Inspection'),
    ('48 m', '48 M Inspection'), ('24 m', '24 M Inspection'),
    ('12 m', '12 M Inspection'), ('10 fh', '10 FH Inspection'),
  ]) { if (text.contains(pair.$1)) return pair.$2; }
  return 'OC Inspection';
}

class MaintenanceTrackingPage extends StatefulWidget {
  const MaintenanceTrackingPage({super.key, required this.session});
  final AirmsSession session;
  @override State<MaintenanceTrackingPage> createState() => _MaintenanceTrackingPageState();
}
class _MaintenanceTrackingPageState extends State<MaintenanceTrackingPage> {
  List<Map<String, dynamic>> findings = [], remaining = [];
  Map<String, dynamic> health = {}, meta = {};
  String aircraft = 'all', query = '', error = '';
  bool loading = true, regenerating = false, rectifying = false;
  int findingsPage = 1, remainingPage = 1, scheduledPage = 1;
  static const pageSize = 5;
  List<T> page<T>(List<T> rows, int number) => rows.skip((number - 1) * pageSize).take(pageSize).toList();
  Widget pages(int count, int current, ValueChanged<int> change) {
    final total = (count / pageSize).ceil();
    if (total <= 1) return const SizedBox.shrink();
    return Row(mainAxisAlignment: MainAxisAlignment.center, children: [
      IconButton(tooltip: 'Previous page', onPressed: current > 1 ? () => change(current - 1) : null, icon: const Icon(Icons.chevron_left)),
      Text('Page $current of $total'),
      IconButton(tooltip: 'Next page', onPressed: current < total ? () => change(current + 1) : null, icon: const Icon(Icons.chevron_right)),
    ]);
  }
  String scheduleState(Map<String, dynamic> task) {
    final status = flightText(task['status']).toLowerCase();
    if (['completed', 'approved', 'closed', 'turned in'].contains(status)) return 'Completed';
    final due = DateTime.tryParse(flightText(task['endDateTime'] ?? task['dueDate']));
    if (due != null && due.isBefore(DateTime.now())) return 'Overdue';
    return 'Scheduled';
  }
  @override void initState() { super.initState(); load(); }
  Future<void> load() async {
    setState(() => loading = true);
    try {
      final results = await Future.wait([
        widget.session.request('/api/ai-insights/maintenance-tracking'),
        widget.session.request('/api/parts-monitoring/inspection-remaining-hours'),
        widget.session.request('/api/ai-insights/health').catchError((_) => <String, dynamic>{}),
      ]);
      if (mounted) { setState(() {
        findings = (results[0]['data'] as List? ?? []).map(flightMap).toList();
        remaining = (results[1]['data'] as List? ?? []).map(flightMap).toList();
        health = flightMap(results[2]);
        meta = flightMap(results[0]['meta']);
        error = '';
      }); }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => loading = false); }
  }
  Future<void> regenerate() async {
    if (regenerating || rectifying || health['configured'] == false || flightMap(health['cooldown'])['active'] == true) return;
    final confirmed = await showDialog<bool>(context: context, builder: (dialogContext) => AlertDialog(
      title: const Text('Regenerate AI summaries?'),
      content: const Text('This refresh may consume server AI quota.'),
      actions: [TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Regenerate'))],
    ));
    if (confirmed != true) return;
    setState(() { regenerating = true; error = ''; });
    try {
      final result = await widget.session.request('/api/ai-insights/maintenance-tracking?includeLLMSummary=1&llmLimit=0');
      if (mounted) {
        setState(() {
          findings = (result['data'] as List? ?? []).map(flightMap).toList();
          meta = flightMap(result['meta']);
        });
        AirmsToast.show('Maintenance summaries refreshed.');
      }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => regenerating = false); }
  }
  bool taskScheduled(Map<String, dynamic> row) {
    final aircraft = flightText(row['aircraft']).toLowerCase();
    final inspection = flightText(row['inspectionName']).toLowerCase();
    return scheduled.any((task) {
      if (!{'pending', 'ongoing', 'returned'}.contains(flightText(task['status']).trim().toLowerCase())) return false;
      if (taskText(task['aircraft']).toLowerCase() != aircraft) return false;
      return flightText(task['title']).toLowerCase() == inspection ||
        (task['checklistItems'] as List? ?? []).whereType<Map>().any((item) =>
          flightText(item['inspectionName'] ?? item['inspectionTypeFull']).trim().toLowerCase() == inspection);
    });
  }
  Future<void> schedule(Map<String, dynamic> row) async {
    final created = await Navigator.push<bool>(context, MaterialPageRoute(builder: (_) => TaskFormPage(session: widget.session, inspectionDraft: {
      'draftType': 'inspectionLimit', ...row, 'dueStatus': dueState(row),
    })));
    if (created == true) load();
  }
  Future<void> rectify(Map<String, dynamic> item) async {
    final confirmed = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: const Text('Mark finding rectified?'), content: Text('This will clear the active maintenance issue for ${item['aircraft']}.'),
      actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')), FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Mark Rectified'))],
    ));
    if (confirmed != true) return;
    setState(() => rectifying = true);
    try {
      await widget.session.request('/api/ai-insights/rectification-task', method: 'POST', body: {
        'aircraft': item['aircraft'], 'aircraftModel': item['aircraftModel'] ?? 'AS350 B3',
        'issueTitle': item['issueTitle'], 'component': item['component'], 'riskLevel': item['riskLevel'],
        'recommendedAction': item['recommendedAction'] ?? '', 'recommendedActions': item['recommendedActions'] ?? [],
        'procedureReference': item['procedureReference'] ?? '', 'procedureTitle': item['procedureTitle'] ?? '',
        'procedureSummary': item['procedureSummary'] ?? '',
        'manualReference': (item['manualReferences'] as List? ?? []).join(' | '),
        'matchedRuleCodes': (item['matchedRules'] as List? ?? []).map((rule) => rule is Map ? rule['ruleCode'] : null).where((value) => value != null).toList(),
        'inspectionName': inferRectificationInspectionName(item), 'confirmAction': true,
      }, extraHeaders: {'x-action-confirmed': 'true'});
      if (mounted) {
        setState(() {
          findings = findings.map((entry) => entry['aircraft'] == item['aircraft'] && entry['issueTitle'] == item['issueTitle']
            ? {...entry, 'riskLevel': 'Low', 'issueTitle': 'No maintenance issue detected',
                'managerSummary': 'No active maintenance flags found from the current records.',
                'recommendedAction': '', 'manualReferences': [], 'matchedRules': []} : entry).toList();
        });
        AirmsToast.show('Maintenance finding marked rectified.');
      }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => rectifying = false); }
  }
  String dueState(Map<String, dynamic> row) {
    final hours = num.tryParse(flightText(row['remainingHours']));
    final days = num.tryParse(flightText(row['remainingDays']));
    if ((hours != null && hours <= 0) || (days != null && days <= 0)) return 'Overdue';
    if ((hours != null && hours <= 25) || (days != null && days <= 30)) return 'Due Soon';
    return 'Monitor';
  }
  List<Map<String, dynamic>> get scheduled => [
    for (final insight in findings.where((item) => aircraft == 'all' || item['aircraft'] == aircraft))
      for (final raw in insight['scheduledTasks'] as List? ?? [])
        {...flightMap(raw), 'aircraft': flightMap(raw)['aircraft'] ?? insight['aircraft']},
  ];
  @override Widget build(BuildContext context) {
    final aircrafts = {...findings.map((item) => flightText(item['aircraft'])), ...remaining.map((item) => flightText(item['aircraft']))}.where((value) => value.isNotEmpty).toList()..sort();
    final userRole = resolveUserRole(widget.session.user);
    final canSchedule = ['maintenance manager', 'admin staff'].contains(userRole);
    final shownFindings = findings.where((item) => aircraft == 'all' || item['aircraft'] == aircraft);
    final shownRemaining = remaining.where((item) => (aircraft == 'all' || item['aircraft'] == aircraft) &&
      matchesSearch(query, {...item, 'dueState': dueState(item), 'remainingLimit': [
        if (item['remainingHours'] != null) '${item['remainingHours']} FH',
        if (item['remainingDays'] != null) '${item['remainingDays']} day(s)',
      ].join(' / ')}));
    final visibleFindings = shownFindings.toList();
    final visibleRemaining = shownRemaining.toList();
    final taskById = <String, Map<String, dynamic>>{};
    for (final insight in findings.where((item) => aircraft == 'all' || item['aircraft'] == aircraft)) {
      for (final raw in insight['scheduledTasks'] as List? ?? []) {
        final task = flightMap(raw);
        final key = flightText(task['id'] ?? '${insight['aircraftId'] ?? insight['aircraft']}-${task['title']}');
        taskById[key] = {...task, 'aircraft': task['aircraft'] ?? insight['aircraft']};
      }
    }
    final scheduledTasks = taskById.values.toList()..sort((a, b) =>
      (DateTime.tryParse(flightText(a['endDateTime'] ?? a['dueDate'])) ?? DateTime.fromMillisecondsSinceEpoch(0))
        .compareTo(DateTime.tryParse(flightText(b['endDateTime'] ?? b['dueDate'])) ?? DateTime.fromMillisecondsSinceEpoch(0)));
    final scheduledCount = scheduledTasks.where((task) => scheduleState(task) == 'Scheduled').length;
    final scheduledOverdue = scheduledTasks.where((task) => scheduleState(task) == 'Overdue').length;
    final scheduledCompleted = scheduledTasks.where((task) => scheduleState(task) == 'Completed').length;
    final high = visibleFindings.where((item) => ['critical', 'high'].contains(flightText(item['riskLevel']).toLowerCase())).length;
    final ai = visibleFindings.where((item) => flightText(item['managerSummarySource']).toLowerCase() == 'openai').length;
    final overdue = visibleRemaining.where((item) => dueState(item) == 'Overdue').length;
    final overdueTasks = scheduledOverdue;
    final highest = visibleFindings.where((item) => ['critical', 'high'].contains(flightText(item['riskLevel']).toLowerCase())).firstOrNull ?? visibleFindings.firstOrNull;
    final withHours = visibleRemaining.where((item) => num.tryParse(flightText(item['remainingHours'])) != null).toList()
      ..sort((a, b) => num.parse(flightText(a['remainingHours'])).compareTo(num.parse(flightText(b['remainingHours']))));
    return RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.all(12), children: [
      Wrap(spacing: 8, runSpacing: 8, children: [
        Chip(label: Text('Aircraft assessed: ${visibleFindings.map((item) => item['aircraft']).toSet().length}')),
        Chip(label: Text('Critical + high: $high')),
        Chip(label: Text('OpenAI summaries: $ai')),
        Chip(label: Text('Rule fallbacks: ${visibleFindings.length - ai}')),
      ]),
      if (health.isNotEmpty) Text('OpenAI: ${health['configured'] == true ? 'Configured' : 'Not configured'} · ${health['reachable'] == true ? 'Reachable' : 'Unavailable'}${health['model'] == null ? '' : ' · ${health['model']}'}'),
      if (flightMap(health['cooldown'])['active'] == true) Text('Cooldown: ${flightMap(health['cooldown'])['retryAfterSeconds'] ?? ''} seconds'),
      if (meta.isNotEmpty) Text('Summary source: ${meta['summarySource'] ?? meta['source'] ?? 'maintenance insights'}'),
      if (userRole != 'officer-in-charge')
        OutlinedButton.icon(onPressed: loading || regenerating || health['configured'] == false || flightMap(health['cooldown'])['active'] == true ? null : regenerate,
          icon: const Icon(Icons.refresh), label: Text(regenerating ? 'Refreshing summaries...' : 'Regenerate OpenAI summaries')),
      DropdownButtonFormField<String>(initialValue: aircraft, decoration: const InputDecoration(labelText: 'Aircraft', border: OutlineInputBorder()), items: ['all', ...aircrafts].map((value) => DropdownMenuItem(value: value, child: Text(value == 'all' ? 'All Aircraft' : 'RP/C: $value'))).toList(), onChanged: (value) => setState(() { aircraft = value ?? 'all'; findingsPage = remainingPage = scheduledPage = 1; })),
      const SizedBox(height: 8),
      Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Maintenance insights', style: Theme.of(context).textTheme.titleMedium),
        Text(highest == null ? 'No active maintenance findings are currently detected.' :
          '${highest['aircraft']}: ${highest['issueTitle']} is the highest current maintenance finding (${highest['riskLevel']}).'),
        Text(overdueTasks > 0 ? '$overdueTasks scheduled task(s) are overdue and should be reviewed first.' :
          '$scheduledCount scheduled task(s) remain open with no overdue task detected.'),
        Text(overdue > 0 ? '$overdue inspection interval(s) are at or past their remaining flight-hour/day limit.' :
          withHours.isEmpty ? 'No remaining flight-hour inspection data is available yet.' :
          '${withHours.first['aircraft']} has the nearest inspection by flight hours: ${withHours.first['inspectionName']} at ${withHours.first['remainingHours']} FH remaining.'),
      ]))),
      if (loading) const Center(child: CircularProgressIndicator()),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text('Maintenance Findings', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
      ...page(visibleFindings, findingsPage).map((item) => Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('${item['aircraft'] ?? ''} · ${item['riskLevel'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold)),
        Text(flightText(item['issueTitle'])),
        Text(flightText(item['managerSummary'] ?? item['shortFinding'])),
        if (flightText(item['recommendedAction']).isNotEmpty) Text('Action: ${item['recommendedAction']}'),
        if ((item['manualReferences'] as List? ?? []).isNotEmpty) Text('Ref: ${(item['manualReferences'] as List).join(' | ')}'),
        if ((item['matchedRules'] as List? ?? []).isNotEmpty && userRole != 'officer-in-charge') TextButton.icon(onPressed: rectifying || regenerating ? null : () => rectify(item), icon: const Icon(Icons.check_circle_outline), label: Text(rectifying ? 'Processing' : 'Mark Rectified')),
      ])))),
      if (!loading && shownFindings.isEmpty) const Text('No active findings found.'),
      pages(visibleFindings.length, findingsPage, (value) => setState(() => findingsPage = value)),
      const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text('Remaining Flight Hours', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
      TextField(decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search aircraft, status, inspection, remaining...', border: OutlineInputBorder()), onChanged: (value) => setState(() { query = value; remainingPage = 1; })),
      ...page(visibleRemaining, remainingPage).map((item) => Card(child: Padding(padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [Expanded(child: Text('${item['aircraft'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold))),
            Chip(label: Text(dueState(item)), backgroundColor: dueState(item) == 'Overdue' ? Colors.red.shade100 :
              dueState(item) == 'Due Soon' ? Colors.orange.shade100 : Colors.blue.shade100)]),
          Text('${item['inspectionName'] ?? ''}'),
          Text('Remaining FH: ${item['remainingHours'] == null ? 'N/A' : '${item['remainingHours']} FH'}'),
          Text('Remaining Days: ${item['remainingDays'] == null ? 'N/A' : '${item['remainingDays']} day(s)'}'),
          Text('Due At: ${item['dueAtHours'] == null ? 'N/A' : '${item['dueAtHours']} FH'}'),
          Text('Due / End: ${formatAirmsDateTime(item['dueDate'], fallback: 'N/A')}'),
          if (taskScheduled(item)) const Chip(label: Text('Task Scheduled'))
          else if (canSchedule) TextButton.icon(onPressed: () => schedule(item), icon: const Icon(Icons.calendar_month), label: const Text('Schedule Task'))
          else const Chip(label: Text('Not scheduled')),
        ])))),
      if (!loading && shownRemaining.isEmpty) const Text('No inspection limits match your search.'),
      pages(visibleRemaining.length, remainingPage, (value) => setState(() => remainingPage = value)),
      const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text('Scheduled Tasks', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
      Wrap(spacing: 8, runSpacing: 8, children: [
        Chip(label: Text('Total: ${scheduledTasks.length}')),
        Chip(label: Text('Scheduled: $scheduledCount')),
        Chip(label: Text('Overdue: $scheduledOverdue')),
        Chip(label: Text('Completed: $scheduledCompleted')),
      ]),
      ...page(scheduledTasks, scheduledPage).map((task) => Card(child: ListTile(
        title: Text('${task['aircraft'] ?? 'N/A'} · ${task['title'] ?? 'Untitled task'}'),
        subtitle: Text('Mechanic: ${task['assignedToName'] ?? 'Unassigned'}\nType: ${task['maintenanceType'] ?? 'Maintenance'}\nStart: ${task['startDateTime'] ?? 'N/A'}\nEnd / Due: ${task['endDateTime'] ?? task['dueDate'] ?? 'N/A'}'),
        isThreeLine: true,
        trailing: Chip(label: Text(scheduleState(task))),
      ))),
      pages(scheduledTasks.length, scheduledPage, (value) => setState(() => scheduledPage = value)),
    ]));
  }
}
