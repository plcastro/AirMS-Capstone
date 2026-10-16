import 'package:flutter/material.dart';
import 'search.dart';
import 'auth.dart';
import 'package:printing/printing.dart';
import 'maintenance_pdf.dart';
import 'viewed_logs.dart';
import 'date_time.dart';
import 'access.dart';

Map<String, dynamic> normalizeMaintenanceLog(Map entry) {
  final details = entry['workDetails'] as List?;
  return {
    ...Map<String, dynamic>.from(entry),
    'id': entry['sourceTaskId'] ?? entry['_id'],
    'sn': '${entry['aircraft'] ?? ''}'.replaceAll(RegExp(r'[^0-9]'), '').isEmpty
      ? 'N/A' : '${entry['aircraft']}'.replaceAll(RegExp(r'[^0-9]'), ''),
    'base': entry['base'] ?? entry['locationBase'] ?? entry['assignedBase'] ??
      entry['stationBase'] ?? entry['sourceBase'] ?? 'UNKNOWN',
    'type': 'Task Assignment',
    'workDetails': details != null && details.isNotEmpty ? details : [
      if (entry['correctiveActionDone'] != null && '${entry['correctiveActionDone']}'.isNotEmpty)
        {'description': entry['correctiveActionDone']},
      if (entry['defects'] != null && '${entry['defects']}'.isNotEmpty)
        {'description': entry['defects']},
      if (entry['taskTitle'] != null && '${entry['taskTitle']}'.isNotEmpty)
        {'description': 'Reference task: ${entry['taskTitle']}'},
    ],
  };
}

class MaintenanceLogsPage extends StatefulWidget {
  const MaintenanceLogsPage({super.key, required this.session});
  final AirmsSession session;
  @override State<MaintenanceLogsPage> createState() => _MaintenanceLogsPageState();
}
class _MaintenanceLogsPageState extends State<MaintenanceLogsPage> {
  List<Map<String, dynamic>> entries = [];
  String search = '', selectedBase = 'all', error = '';
  bool loading = true;
  late final ViewedLogs viewed;
  bool viewedReady = false;
  bool get mechanic => resolveUserRole(widget.session.user) == 'mechanic';
  String get myBase => '${widget.session.session['base'] ?? ''}'.trim().toUpperCase();
  @override void initState() {
    super.initState();
    if (mechanic && myBase.isNotEmpty) selectedBase = myBase;
    viewed = ViewedLogs('${widget.session.user?['_id'] ?? widget.session.user?['id'] ?? ''}', 'maintenance');
    viewed.load().then((_) { if (mounted) setState(() => viewedReady = true); });
    load();
  }
  Future<void> load() async {
    setState(() => loading = true);
    try {
      final data = await widget.session.request('/api/maintenance-logs/getAllMaintenanceLog');
      if (mounted) {
        setState(() {
          entries = (data['data'] as List? ?? []).whereType<Map>().map(normalizeMaintenanceLog).toList();
          error = '';
        });
      }
    } catch (e) { if (mounted) setState(() { error = '$e'; entries = []; }); }
    finally { if (mounted) setState(() => loading = false); }
  }
  String base(Map row) => '${row['base'] ?? row['locationBase'] ?? row['assignedBase'] ?? row['stationBase'] ?? row['sourceBase'] ?? 'UNKNOWN'}'.toUpperCase();
  @override Widget build(BuildContext context) {
    final filtered = entries.where((row) => (mechanic ? (myBase.isNotEmpty && base(row) == myBase) :
      (selectedBase == 'all' || base(row) == selectedBase)) &&
      matchesSearch(search, row)).toList();
    final grouped = <String, List<Map<String, dynamic>>>{};
    for (final row in filtered) {
      final aircraft = '${row['aircraft'] ?? ''}';
      if (aircraft.isNotEmpty) grouped.putIfAbsent(aircraft, () => []).add(row);
    }
    final bases = ['all', ...entries.map(base).toSet()];
    return RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.all(16), children: [
      TextField(decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search maintenance logs',
        border: OutlineInputBorder()), onChanged: (value) => setState(() => search = value)),
      if (!mechanic) DropdownButtonFormField<String>(initialValue: bases.contains(selectedBase) ? selectedBase : 'all',
        decoration: const InputDecoration(labelText: 'Base'),
        items: bases.map((value) => DropdownMenuItem(value: value, child: Text(value == 'all' ? 'All Bases' : value))).toList(),
        onChanged: (value) => setState(() => selectedBase = value ?? 'all')),
      if (loading) const LinearProgressIndicator(),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      if (!loading && grouped.isEmpty) const Padding(padding: EdgeInsets.all(30), child: Center(child: Text('No maintenance logs found'))),
      for (final group in grouped.entries) Card(child: ListTile(title: Text(group.key,
        style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text('${group.value.length} work orders · ${base(group.value.first)}${viewedReady && group.value.where(viewed.isNew).isNotEmpty ? ' · ${group.value.where(viewed.isNew).length} new' : ''}'),
        trailing: const Icon(Icons.chevron_right),
        onTap: () async {
          for (final row in group.value) { await viewed.markViewed(row); }
          if (!context.mounted) return;
          setState(() {});
          await Navigator.push(context, MaterialPageRoute(builder: (_) => _AircraftLogsPage(
            aircraft: group.key, entries: group.value, session: widget.session,
            canExport: canExportModule(resolveUserRole(widget.session.user), 'maintenanceLogs'))));
        },
      )),
    ]));
  }
}

class _AircraftLogsPage extends StatelessWidget {
  const _AircraftLogsPage({required this.aircraft, required this.entries, required this.canExport, required this.session});
  final String aircraft;
  final List<Map<String, dynamic>> entries;
  final bool canExport;
  final AirmsSession session;
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: Text(aircraft)),
    body: ListView(padding: const EdgeInsets.all(16), children: [
      Card(child: ListTile(title: const Text('Maintenance snapshot'),
        subtitle: Text('Reported by: ${entries.first['reportedBy'] ?? ''}\nBase: ${entries.first['base'] ?? ''}'
          '\nACFT S/N: ${entries.first['sn'] ?? aircraft.replaceAll(RegExp(r'[^0-9]'), '')}\nWork orders: ${entries.length}\nSource: Task Assignment'))),
      const Text('Work Orders', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
      for (final entry in entries) Card(child: ListTile(
        title: Text('${entry['sourceTaskId'] ?? entry['_id'] ?? ''}'),
        subtitle: Text('${entry['taskTitle'] ?? 'Untitled task'}\n${formatAirmsDate(entry['dateDefectRectified'])} · ${entry['status'] ?? ''}\nBase: ${entry['base'] ?? 'N/A'}'),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => _WorkOrderPage(entry: entry, canExport: canExport, session: session))),
      )),
    ]));
}

class _WorkOrderPage extends StatelessWidget {
  const _WorkOrderPage({required this.entry, required this.canExport, required this.session});
  final Map<String, dynamic> entry;
  final bool canExport;
  final AirmsSession session;
  Future<void> export() async {
    Map<String, dynamic>? aircraftData;
    try {
      final response = await session.request('/api/parts-monitoring/${Uri.encodeComponent('${entry['aircraft'] ?? ''}')}');
      if (response['data'] is Map) aircraftData = Map<String, dynamic>.from(response['data'] as Map);
    } catch (_) { /* The original export permits missing aircraft details. */ }
    final bytes = await buildMaintenancePdf(entry, aircraftData: aircraftData);
    await Printing.sharePdf(bytes: bytes,
      filename: 'WorkDoneReport_${entry['aircraft'] ?? 'Aircraft'}_${DateTime.now().toIso8601String().split('T').first}.pdf');
  }
  @override Widget build(BuildContext context) {
    final details = normalizeMaintenanceLog(entry)['workDetails'] as List;
    return Scaffold(appBar: AppBar(title: const Text('Work Done Report')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        if (canExport) OutlinedButton.icon(onPressed: export, icon: const Icon(Icons.picture_as_pdf_outlined), label: const Text('Export PDF')),
        Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${entry['sourceTaskId'] ?? entry['_id'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold)),
          Text('Aircraft: ${entry['aircraft'] ?? ''}'), Text('Base: ${entry['base'] ?? ''}'),
          Text('Mechanic in charge: ${entry['mechanicInCharge'] ?? entry['reportedBy'] ?? ''}'),
          Text('Inspector: ${entry['inspector'] ?? entry['approvedBy'] ?? ''}'),
          Text('Mechanic license: ${entry['mechanicLicenseNo'] ?? entry['licenseNo'] ?? ''}'),
          Text('Inspector license: ${entry['inspectorLicenseNo'] ?? ''}'),
          Text('Rectified: ${formatAirmsDate(entry['dateDefectRectified'])}'),
          Text('Task status: ${entry['sourceTaskStatus'] ?? ''}'),
          Text('Task title: ${entry['taskTitle'] ?? ''}'),
        ]))),
        const SizedBox(height: 14), const Text('Description of Work', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        for (var index = 0; index < details.length; index++) Card(child: Padding(padding: const EdgeInsets.all(12),
          child: Text('${index + 1}. ${details[index] is Map ? details[index]['description'] : details[index]}'))),
      ]));
  }
}
