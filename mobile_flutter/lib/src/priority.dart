import 'package:flutter/material.dart';
import 'search.dart';
import 'auth.dart';
import 'access.dart';
import 'date_time.dart';
import 'toast.dart';
import 'flight_logs.dart' show flightMap;

const defaultRules = <String, int>{
  'criticalDueDays': 5, 'criticalRemainingHours': 14,
  'highDueDays': 7, 'highRemainingHours': 24,
  'mediumDueDays': 14, 'longTurnaroundHours': 5,
};

class PriorityPage extends StatefulWidget {
  const PriorityPage({super.key, required this.session});
  final AirmsSession session;
  @override State<PriorityPage> createState() => _PriorityPageState();
}
class _PriorityPageState extends State<PriorityPage> {
  List<Map> rankings = [];
  Map<String, dynamic> meta = {};
  Map<String, int> rules = {...defaultRules}, draft = {...defaultRules};
  bool loading = true, saving = false, showRules = false;
  String search = '', error = '';
  int page = 0;
  @override void initState() { super.initState(); load(); }
  Future<void> load() async {
    setState(() => loading = true);
    try {
      Map incoming = {};
      try {
        final response = await widget.session.request('/api/parts-monitoring/maintenance-priority/rules');
        incoming = response['data'] as Map? ?? {};
      } catch (_) { /* Use the same default thresholds as React Native. */ }
      final nextRules = {...defaultRules};
      for (final key in defaultRules.keys) {
        if (incoming[key] is num) nextRules[key] = (incoming[key] as num).toInt();
      }
      if (mounted) setState(() { rules = nextRules; draft = {...nextRules}; });
      await loadRanking(nextRules);
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => loading = false); }
  }
  Future<void> loadRanking(Map<String, int> activeRules) async {
    try {
      final query = Uri(queryParameters: activeRules.map((key, value) => MapEntry(key, '$value'))).query;
      final response = await widget.session.request('/api/parts-monitoring/maintenance-priority?$query');
      if (mounted) setState(() { rankings = (response['data'] as List? ?? []).whereType<Map>().toList(); meta = Map<String, dynamic>.from(response['meta'] as Map? ?? {}); error = ''; page = 0; });
    } catch (e) { if (mounted) setState(() => error = '$e'); }
  }
  Future<bool> confirm(String label) async => await showDialog<bool>(context: context,
    builder: (_) => AlertDialog(title: Text(label), content: Text('$label now?'), actions: [
      TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
      FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Confirm')),
    ])) ?? false;
  Future<void> saveRules() async {
    if (!await confirm('Save priority rules')) return;
    setState(() => saving = true);
    try {
      final result = await widget.session.request('/api/parts-monitoring/maintenance-priority/rules',
        method: 'PUT', extraHeaders: {'x-action-confirmed': 'true'},
        body: {...draft, 'confirmAction': true});
      final values = result['data'] as Map? ?? {};
      setState(() => rules = {...defaultRules, for (final key in defaultRules.keys)
        if (values[key] is num) key: (values[key] as num).toInt()});
      await loadRanking(rules);
      if (mounted) AirmsToast.show('Maintenance priority rules saved.');
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => saving = false); }
  }
  Future<void> saveOverride(Map record, String level, String reason) async {
    final aircraft = '${record['aircraft'] ?? ''}';
    if (aircraft.isEmpty) return;
    try {
      await widget.session.request('/api/parts-monitoring/maintenance-priority/${Uri.encodeComponent(aircraft)}/override',
        method: 'PUT', extraHeaders: {'x-action-confirmed': 'true'},
        body: {'level': level, if (level != 'Auto') 'reason': reason});
      await loadRanking(rules);
      if (mounted) AirmsToast.show('Maintenance priority saved.');
    } catch (e) { if (mounted) setState(() => error = '$e'); }
  }
  @override Widget build(BuildContext context) {
    final role = resolveUserRole(widget.session.user);
    final canOverride = role == 'maintenance manager' || role == 'admin staff' ||
      normalizeRole(widget.session.user?['access']) == 'admin staff';
    final filtered = rankings.where((row) => matchesSearch(search, row)).toList();
    final visible = filtered.skip(page * 10).take(10).toList();
    final turnaround = rankings.map((row) => num.tryParse('${row['estimatedTurnaroundHours'] ?? ''}'))
      .whereType<num>().toList()..sort();
    return RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.all(16), children: [
      const Text('Maintenance Priority Sorting', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
      const Text('Rule-based aircraft ranking for upcoming maintenance work'),
      const SizedBox(height: 12),
      TextField(decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search aircraft or inspection', border: OutlineInputBorder()),
        onChanged: (value) => setState(() { search = value; page = 0; })),
      const SizedBox(height: 10),
      Wrap(spacing: 8, children: [
        Chip(label: Text('Aircraft: ${rankings.length}')),
        Chip(label: Text('Critical: ${rankings.where((row) => row['priorityLevel'] == 'Critical').length}')),
        Chip(label: Text('High: ${rankings.where((row) => row['priorityLevel'] == 'High').length}')),
        Chip(label: Text('Fastest turnaround: ${turnaround.isEmpty ? 'N/A' : turnaround.first} hrs')),
      ]),
      OutlinedButton.icon(onPressed: () => setState(() => showRules = !showRules), icon: const Icon(Icons.tune), label: const Text('Rule Controls')),
      if (showRules) Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(children: [
        for (final key in draft.keys) TextFormField(key: ValueKey(key), initialValue: '${draft[key]}',
          keyboardType: TextInputType.number, decoration: InputDecoration(labelText: key),
          onChanged: (value) => draft[key] = int.tryParse(value) ?? 0),
        Row(children: [Expanded(child: OutlinedButton(onPressed: () async {
          if (await confirm('Apply priority rules')) { setState(() => rules = {...draft}); await loadRanking(rules); }
        }, child: const Text('Apply'))), const SizedBox(width: 8),
          Expanded(child: FilledButton(onPressed: saving ? null : saveRules, child: const Text('Save Defaults')))]),
      ]))),
      if (loading) const LinearProgressIndicator(),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      if (meta.isNotEmpty) Card(child: ListTile(title: const Text('Priority Logic'), subtitle: Text(
        'Critical <= ${flightMap(meta['rules'])['criticalDueDays'] ?? rules['criticalDueDays']} days or <= ${flightMap(meta['rules'])['criticalRemainingHours'] ?? rules['criticalRemainingHours']} FH'))),
      Text('Ranked Maintenance · Showing ${filtered.isEmpty ? 0 : page * 10 + 1}-${(page * 10 + 10).clamp(0, filtered.length)} of ${filtered.length} aircraft/inspection ranking row(s)'),
      if (!loading && filtered.isEmpty) const Text('No records found.'),
      for (final row in visible) _PriorityCard(record: row, onSave: saveOverride, canOverride: canOverride),
      if (filtered.length > 10) Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        TextButton(onPressed: page > 0 ? () => setState(() => page--) : null, child: const Text('Previous')),
        Text('Page ${page + 1} of ${(filtered.length / 10).ceil()}'),
        TextButton(onPressed: (page + 1) * 10 < filtered.length ? () => setState(() => page++) : null, child: const Text('Next')),
      ]),
    ]));
  }
}

class _PriorityCard extends StatefulWidget {
  const _PriorityCard({required this.record, required this.onSave, required this.canOverride});
  final Map record;
  final Future<void> Function(Map, String, String) onSave;
  final bool canOverride;
  @override State<_PriorityCard> createState() => _PriorityCardState();
}
class _PriorityCardState extends State<_PriorityCard> {
  late String level;
  final reason = TextEditingController();
  @override void initState() { super.initState();
    final override = widget.record['manualPriorityOverride'] as Map?;
    level = '${override?['level'] ?? 'Auto'}'; reason.text = '${override?['reason'] ?? ''}';
  }
  @override void dispose() { reason.dispose(); super.dispose(); }
  @override Widget build(BuildContext context) {
    final record = widget.record;
    return Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [Expanded(child: Text('#${record['rank'] ?? '-'} ${record['aircraft'] ?? 'N/A'}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
        Chip(label: Text('${record['priorityLevel'] ?? ''}'))]),
      Text('${record['nextInspection'] ?? 'Next inspection unavailable'}'),
      Text('Model: ${record['aircraftModel'] ?? 'N/A'}'),
      Text('Due: ${record['dueByHours'] ?? 'N/A'} FH / ${record['dueByDays'] ?? 'N/A'} days'),
      Text('Calendar Due: ${formatAirmsDateTime(record['dueDate'], fallback: 'N/A')}'),
      Text('Turnaround: ${record['estimatedTurnaroundHours'] ?? 'N/A'} hours'),
      Text('${record['priorityReason'] ?? ''}'),
      if (record['manualPriorityOverride'] is Map) Text('Manual override: ${(record['manualPriorityOverride'] as Map)['level'] ?? 'Auto'} · ${(record['manualPriorityOverride'] as Map)['reason'] ?? ''}'),
      if (widget.canOverride) DropdownButtonFormField<String>(initialValue: level, decoration: const InputDecoration(labelText: 'Priority override'),
        items: ['Auto', 'Critical', 'High', 'Medium', 'Low'].map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(),
        onChanged: (value) => setState(() => level = value ?? 'Auto')),
      if (widget.canOverride && level != 'Auto') TextField(controller: reason, decoration: const InputDecoration(labelText: 'Reason (optional)')),
      if (widget.canOverride) FilledButton(onPressed: () => widget.onSave(record, level, reason.text.trim()), child: const Text('Save priority')),
    ])));
  }
}
