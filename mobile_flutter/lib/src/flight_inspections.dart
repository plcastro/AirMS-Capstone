import 'package:flutter/material.dart';
import 'search.dart';
import 'auth.dart';
import 'flight_logs.dart';
import 'file_exports.dart';
import 'inspection_checklist.dart';
import 'viewed_logs.dart';

DateTime inspectionDate(dynamic value) {
  final text = flightText(value).trim();
  final iso = DateTime.tryParse(text);
  if (iso != null) return iso;
  final match = RegExp(r'^(\d{1,2})/(\d{1,2})/(\d{4})$').firstMatch(text);
  if (match != null) return DateTime(int.parse(match[3]!), int.parse(match[1]!), int.parse(match[2]!));
  return DateTime(1970);
}

String inspectionDisplayStatus(Map<String, dynamic> item) {
  final value = flightText(item['status']).trim().toLowerCase();
  return value == 'completed' || value == 'released' ? value : 'pending';
}

List<Map<String, dynamic>> filterInspectionsByStatus(List<Map<String, dynamic>> items, String status) =>
  items.where((item) => status == 'all' || inspectionDisplayStatus(item) == status).toList();

class FlightInspectionsPage extends StatefulWidget {
  const FlightInspectionsPage({super.key, required this.session, required this.kind});
  final AirmsSession session;
  final String kind;
  @override State<FlightInspectionsPage> createState() => _FlightInspectionsPageState();
}
class _FlightInspectionsPageState extends State<FlightInspectionsPage> {
  List<Map<String, dynamic>> inspections = [];
  String aircraft = '', status = 'all', sortOrder = 'newest', query = '', aircraftQuery = '', error = '';
  bool loading = true;
  late final ViewedLogs viewed;
  bool viewedReady = false;
  @override void initState() {
    super.initState();
    viewed = ViewedLogs(flightText(widget.session.user?['_id'] ?? widget.session.user?['id']), widget.kind);
    status = widget.kind == 'pre' ? 'released' : 'pending';
    loadStatus();
    viewed.load().then((_) { if (mounted) setState(() => viewedReady = true); });
    load();
  }
  String get statusKey => 'status-filter:${widget.kind}:${flightText(widget.session.user?['id'] ?? widget.session.user?['_id'])}';
  Future<void> loadStatus() async {
    final prefs = await preferences();
    final saved = prefs.getString(statusKey);
    if (mounted && const {'all', 'pending', 'released', 'completed'}.contains(saved)) {
      setState(() => status = saved!);
    }
  }
  Future<void> selectStatus(String value) async {
    setState(() => status = value);
    final prefs = await preferences();
    await prefs.setString(statusKey, value);
  }
  Future<void> exportInspection(Map<String, dynamic> item) async {
    final id = flightText(item['_id'] ?? item['id']);
    if (id.isEmpty) return;
    try {
      final kind = widget.kind;
      await openAuthenticatedExport(widget.session, '/api/inspections/$kind/$id/export-pdf',
        '${kind}_inspection_${flightText(item['controlNo']).isEmpty ? id : flightText(item['controlNo'])}.pdf');
    } catch (e) { if (mounted) setState(() => error = '$e'); }
  }
  Future<void> load() async {
    setState(() => loading = true);
    try {
      final pre = widget.kind == 'pre';
      final result = await widget.session.request(pre ? '/api/pre-flight/getAllPreInspection' : '/api/post-flight/getAllPostInspection');
      final list = result['data'];
      if (mounted) setState(() { inspections = (list is List ? list : <dynamic>[]).map(flightMap).toList(); error = ''; });
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => loading = false); }
  }
  @override Widget build(BuildContext context) {
    final matching = filterInspectionsByStatus(inspections, status);
    final newest = matching.toList()..sort((a, b) =>
      inspectionDate(b['updatedAt'] ?? b['createdAt'] ?? b['date'])
        .compareTo(inspectionDate(a['updatedAt'] ?? a['createdAt'] ?? a['date'])));
    final aircrafts = newest.map(flightAircraft).toSet().toList();
    final visible = matching.where((item) => flightAircraft(item) == aircraft &&
      matchesSearch(query, item)).toList()..sort((a, b) {
      final first = inspectionDate(a['date'] ?? a['createdAt']);
      final second = inspectionDate(b['date'] ?? b['createdAt']);
      return sortOrder == 'oldest' ? first.compareTo(second) : second.compareTo(first);
    });
    return RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.all(12), children: [
      TextField(key: ValueKey(aircraft.isEmpty ? 'inspection-aircraft-search' : 'inspection-record-search'),
        decoration: InputDecoration(prefixIcon: const Icon(Icons.search),
          labelText: aircraft.isEmpty ? 'Search aircraft' : 'Search ${widget.kind == 'pre' ? 'pre' : 'post'}-flight inspections',
          border: const OutlineInputBorder()), onChanged: (value) => setState(() {
            if (aircraft.isEmpty) { aircraftQuery = value; } else { query = value; }
          })),
      if (aircraft.isEmpty) SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children:
        ['all', 'pending', 'released', 'completed'].map((value) => Padding(
          padding: const EdgeInsets.only(right: 6), child: ChoiceChip(label: Text(value == 'all' ? 'All status' : '${value[0].toUpperCase()}${value.substring(1)}'),
            selected: status == value, onSelected: (_) => selectStatus(value)))).toList())),
      if (aircraft.isEmpty) ...aircrafts.where((name) => matchesSearch(aircraftQuery, name)).map((name) {
        final records = matching.where((item) => flightAircraft(item) == name).toList();
        final fresh = viewedReady ? records.where(viewed.isNew).length : 0;
        return Card(child: ListTile(leading: const Icon(Icons.flight), title: Text(name),
          subtitle: Text('${records.length} inspections${fresh > 0 ? ' · $fresh new' : ''}'),
          trailing: const Icon(Icons.chevron_right), onTap: () => setState(() { aircraft = name; query = ''; })));
      }),
      if (!loading && aircraft.isEmpty && !aircrafts.any((name) => matchesSearch(aircraftQuery, name)))
        Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(
          status == 'all' ? 'No ${widget.kind == 'pre' ? 'pre' : 'post'}-flight inspections found yet.' : 'No $status ${widget.kind == 'pre' ? 'pre' : 'post'}-flight inspections found yet.'))),
      if (aircraft.isNotEmpty) ...[
        TextButton.icon(onPressed: () => setState(() { aircraft = ''; query = ''; }), icon: const Icon(Icons.arrow_back), label: Text(aircraft)),
        SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: ['all', 'pending', 'released', 'completed'].map((value) => Padding(padding: const EdgeInsets.only(right: 6), child: ChoiceChip(label: Text(value == 'all' ? 'All status' : '${value[0].toUpperCase()}${value.substring(1)}'), selected: status == value, onSelected: (_) => selectStatus(value)))).toList())),
        DropdownButtonFormField<String>(initialValue: sortOrder,
          decoration: const InputDecoration(labelText: 'Sort inspections', border: OutlineInputBorder()),
          items: const [DropdownMenuItem(value: 'newest', child: Text('Newest First')),
            DropdownMenuItem(value: 'oldest', child: Text('Oldest First'))],
          onChanged: (value) => setState(() => sortOrder = value ?? 'newest')),
        ...visible.map((item) => Card(child: ListTile(title: Text('${flightText(item['controlNo']).isEmpty ? '${widget.kind == 'pre' ? 'Pre' : 'Post'}-Flight Inspection' : flightText(item['controlNo'])}${viewedReady && viewed.isNew(item) ? ' · NEW' : ''}'),
          subtitle: Text('${flightText(item['date'])} · ${flightText(item['status'])}'),
          trailing: IconButton(tooltip: 'Export inspection PDF', onPressed: () => exportInspection(item), icon: const Icon(Icons.picture_as_pdf_outlined)),
          onTap: () async {
            await viewed.markViewed(item);
            if (!context.mounted) return;
            setState(() {});
            await Navigator.push(context, MaterialPageRoute(builder: (_) {
            final reference = item['flightLogId'];
            final flightId = reference is Map ? flightText(reference['_id'] ?? reference['id']) : flightText(reference);
            return flightId.isEmpty ? InspectionDetailPage(item: item, kind: widget.kind) : FlightWorkspacePage(
              session: widget.session, id: flightId, initialTab: widget.kind);
          }));
          }))),
        if (!loading && visible.isEmpty) Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(
          'No ${widget.kind == 'pre' ? 'pre' : 'post'}-flight inspections match your filters.'))),
      ],
      if (loading) const Center(child: CircularProgressIndicator()),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
    ]));
  }
}
class InspectionDetailPage extends StatelessWidget {
  const InspectionDetailPage({super.key, required this.item, required this.kind});
  final Map<String, dynamic> item;
  final String kind;
  Future<List<Map<String, dynamic>>> checklist() async {
    return loadInspectionChecklist(kind, flightText(item['aircraftType']));
  }
  @override Widget build(BuildContext context) {
    final b412 = flightText(item['aircraftType']).contains('412');
    final checks = b412 ? flightMap(flightMap(item['b412Data'])['checks']) : item;
    final discrepancies = flightMap(item['discrepancies']);
    final released = flightMap(item['releasedBy']);
    final accepted = flightMap(item['acceptedBy']);
    return Scaffold(appBar: AppBar(title: Text('${kind == 'pre' ? 'Pre' : 'Post'}-Flight Inspection')),
      body: ListView(padding: const EdgeInsets.all(12), children: [
        Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(flightText(item['controlNo']).isEmpty ? 'Inspection record' : flightText(item['controlNo']), style: Theme.of(context).textTheme.titleMedium),
          Text('Aircraft: ${item['rpc'] ?? item['aircraft'] ?? ''} · ${item['aircraftType'] ?? ''}'),
          Text('Date: ${item['date'] ?? ''} · Status: ${item['status'] ?? ''}'),
          if (kind == 'pre') Text('Fuel on board: ${item['fob'] ?? ''}'),
          if (kind == 'post' && flightText(item['notes']).isNotEmpty) Text('Notes: ${item['notes']}'),
          if (flightText(released['name']).isNotEmpty) Text('Released by: ${released['name']} · ${released['title'] ?? ''} · ${released['timestamp'] ?? ''}'),
          if (flightText(accepted['name']).isNotEmpty) Text('Accepted by: ${accepted['name']} · ${accepted['title'] ?? ''} · ${accepted['timestamp'] ?? ''}'),
        ]))),
        FutureBuilder<List<Map<String, dynamic>>>(future: checklist(), builder: (context, snapshot) {
          if (snapshot.hasError) return Text('Checklist unavailable: ${snapshot.error}');
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
          final rows = snapshot.data!;
          final completed = rows.where((row) => checks[row['key']] == true).length;
          return Column(children: [
            Card(child: ListTile(title: const Text('Checklist progress'), subtitle: Text('$completed of ${rows.length} checks completed'))),
            for (var index = 0; index < rows.length; index++) ...[
            if (index == 0 || rows[index]['_section'] != rows[index - 1]['_section'])
              Padding(padding: const EdgeInsets.only(top: 14, bottom: 6), child: Text('${rows[index]['_section']}',
                style: Theme.of(context).textTheme.titleMedium)),
            Card(child: CheckboxListTile(value: checks[rows[index]['key']] == true, onChanged: null,
              title: Text(flightText(rows[index]['title'])), subtitle: Text(flightText(rows[index]['description'])))),
          ]]);
        }),
        if (discrepancies.isNotEmpty) Text('Discrepancies', style: Theme.of(context).textTheme.titleMedium),
        for (final entry in discrepancies.entries) Card(child: ListTile(
          title: Text(entry.key), subtitle: Text('Finding: ${flightMap(entry.value)['note'] ?? ''}\nCorrection: ${flightMap(entry.value)['resolution'] ?? 'Pending'}'),
          trailing: Icon(flightMap(entry.value)['resolved'] == true ? Icons.check_circle_outline : Icons.error_outline),
        )),
        for (final entry in item.entries.where((entry) => !entry.key.startsWith('_') &&
          !['b412Data', 'discrepancies', 'flightLogId'].contains(entry.key) && entry.value is! Map && entry.value is! List))
          if (!['controlNo', 'rpc', 'aircraft', 'aircraftType', 'date', 'status', 'fob', 'notes'].contains(entry.key))
            ListTile(title: Text(entry.key), subtitle: Text('${entry.value ?? ''}')),
      ]));
  }
}
