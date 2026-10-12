import 'package:flutter/material.dart';
import 'auth.dart';
import 'flight_signing.dart';
import 'flight_logs.dart';
import 'inspection_checklist.dart';
import 'inspection_rules.dart';

class FlightCreatePage extends StatefulWidget {
  const FlightCreatePage({super.key, required this.session, required this.ongoing, this.initialRpc = ''});
  final AirmsSession session;
  final Set<String> ongoing;
  final String initialRpc;
  @override State<FlightCreatePage> createState() => _FlightCreatePageState();
}
class _FlightCreatePageState extends State<FlightCreatePage> {
  List<String> aircraft = [];
  List<Map<String, dynamic>> items = [];
  List<Map<String, dynamic>> pilots = [];
  final checked = <String>{};
  final discrepancies = <String, String>{};
  String rpc = '', aircraftType = '', error = '', confirmationId = '';
  String pilotId = '';
  Map<String, dynamic> confirmation = {};
  bool busy = false;
  int checklistPage = 0;
  final control = TextEditingController(), date = TextEditingController();
  @override void initState() { super.initState(); date.text = '${DateTime.now().month.toString().padLeft(2, '0')}/${DateTime.now().day.toString().padLeft(2, '0')}/${DateTime.now().year}'; loadAircraft(); loadPilots(); }
  @override void dispose() { control.dispose(); date.dispose(); super.dispose(); }
  Future<void> loadAircraft() async {
    try {
      final result = await widget.session.request('/api/parts-monitoring/aircraft-list');
      final data = result is Map ? result['data'] : null;
      if (mounted) {
        final available = (data is List ? data : []).map((e) => '$e').toList();
        setState(() => aircraft = available);
        final initial = available.where((value) => value.trim().toUpperCase() ==
          widget.initialRpc.trim().toUpperCase()).firstOrNull;
        if (initial != null && !widget.ongoing.contains(initial.trim().toUpperCase())) {
          await selectAircraft(initial);
        }
      }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
  }
  Future<void> loadPilots() async {
    try {
      final result = await widget.session.request('/api/flightlogs/crew-options');
      if (mounted) setState(() => pilots = (result['data'] as List? ?? []).whereType<Map>().map((item) => Map<String, dynamic>.from(item)).where((item) => flightText(item['role']).toLowerCase() == 'pilot').toList());
    } catch (e) { if (mounted) setState(() => error = '$e'); }
  }
  Future<void> selectAircraft(String value) async {
    setState(() { rpc = value; checked.clear(); discrepancies.clear(); items = []; checklistPage = 0; confirmationId = ''; error = ''; });
    try {
      final result = await widget.session.request('/api/parts-monitoring/${Uri.encodeComponent(value)}');
      final type = '${(result['data'] as Map?)?['aircraftType'] ?? ''}';
      final checklist = await loadInspectionChecklist('pre', type);
      if (mounted) setState(() { aircraftType = type; items = checklist; });
    } catch (e) { if (mounted) setState(() => error = '$e'); }
  }
  Future<void> confirm({bool allGood = true}) async {
    if (allGood && (checked.length != items.length || items.isEmpty || discrepancies.isNotEmpty)) { setState(() => error = 'Review and check every Pre-Flight item before signing.'); return; }
    if (discrepancies.values.any((note) => note.trim().isEmpty)) { setState(() => error = 'Describe every flagged discrepancy before continuing.'); return; }
    if (items.isEmpty) return;
    final signature = allGood ? await collectFlightSignature(context, widget.session) : null;
    if (allGood && signature == null) return;
    setState(() { busy = true; error = ''; });
    try {
      final result = await widget.session.request('/api/flightlogs/preflight-confirmations', method: 'POST', body: {
        'rpc': rpc, 'allGood': allGood, 'checked': checked.toList(),
        'discrepancies': discrepancies.map((key, value) => MapEntry(key, {'note': value.trim()})),
        if (signature != null) 'signature': signature.image, if (signature != null) 'pin': signature.pin,
      }, extraHeaders: {'x-action-confirmed': 'true'});
      if (mounted) setState(() { confirmation = Map<String, dynamic>.from(result['data']); confirmationId = '${confirmation['confirmationId']}'; });
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> create() async {
    if (confirmationId.isEmpty) return;
    setState(() { busy = true; error = ''; });
    try {
      await widget.session.request('/api/flightlogs', method: 'POST', body: {
        'rpc': rpc, 'aircraftType': aircraftType, 'confirmationId': confirmationId,
        'initialInspectionSignature': confirmation['initialInspectionSignature'],
        'controlNo': control.text.trim(), 'date': date.text.trim(),
        if (pilotId.isNotEmpty) 'assignedPilot': {'userId': pilotId},
        'status': 'pending_release', 'confirmAction': true,
        'legs': [{'stations': [{'from': '', 'to': ''}], 'blockTimeOn': '', 'blockTimeOff': '', 'flightTimeOn': '', 'flightTimeOff': '', 'totalTimeOn': '', 'totalTimeOff': '', 'date': '', 'passengers': '0'}],
      }, extraHeaders: {'x-action-confirmed': 'true'});
      if (mounted) Navigator.pop(context, true);
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) {
    final pages = (items.length / inspectionPageSize).ceil().clamp(1, 99999);
    final visible = items.skip(checklistPage * inspectionPageSize).take(inspectionPageSize).toList();
    void updateChecks(Iterable<String> keys, bool value) => setState(() {
      final next = setInspectionChecks(keys, checked, discrepancies.keys.toSet(), value);
      checked..clear()..addAll(next);
    });
    return Scaffold(appBar: AppBar(title: const Text('New Flight Log')),
    body: ListView(padding: const EdgeInsets.all(16), children: [
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      DropdownButtonFormField<String>(initialValue: rpc.isEmpty ? null : rpc, decoration: const InputDecoration(labelText: 'Aircraft registration', border: OutlineInputBorder()),
        items: aircraft.where((value) => !widget.ongoing.contains(value.trim().toUpperCase())).map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(),
        onChanged: busy ? null : (value) { if (value != null) selectAircraft(value); }),
      const SizedBox(height: 12),
      if (rpc.isNotEmpty) Text('Pre-Flight Inspection · $aircraftType', style: Theme.of(context).textTheme.titleMedium),
      if (rpc.isNotEmpty && items.isEmpty) const Padding(padding: EdgeInsets.all(20), child: Text('Loading checklist…')),
      if (confirmationId.isEmpty && items.isNotEmpty) ...[
        const Text('Review every pre-flight item in person. Check each item, or flag it as a discrepancy. You can save a draft and finish later.'),
        Wrap(spacing: 6, children: [
          OutlinedButton(onPressed: busy ? null : () => updateChecks(items.map((item) => '${item['key']}'), true), child: const Text('Mark all items good')),
          OutlinedButton(onPressed: busy ? null : () => updateChecks(items.map((item) => '${item['key']}'), false), child: const Text('Clear all')),
          OutlinedButton(onPressed: busy ? null : () => updateChecks(visible.map((item) => '${item['key']}'), true), child: const Text('Select all on this page')),
          OutlinedButton(onPressed: busy ? null : () => updateChecks(visible.map((item) => '${item['key']}'), false), child: const Text('Clear this page')),
        ]),
      ],
      if (confirmationId.isEmpty) for (var index = 0; index < visible.length; index++) ...[
        if (index == 0 || visible[index]['_section'] != visible[index - 1]['_section'])
          Padding(padding: const EdgeInsets.only(top: 14, bottom: 6), child: Text('${visible[index]['_section']}',
            style: Theme.of(context).textTheme.titleMedium)),
        Builder(builder: (context) { final item = visible[index]; final key = '${item['key']}'; final flagged = discrepancies.containsKey(key); return Card(child: Column(children: [
        Row(children: [Expanded(child: CheckboxListTile(
          value: checked.contains(key), title: Text('${item['title']}'), subtitle: Text('${item['description'] ?? ''}'),
          onChanged: busy || flagged ? null : (value) => setState(() { if (value == true) { checked.add(key); } else { checked.remove(key); } }),
        )), IconButton(tooltip: flagged ? 'Remove discrepancy flag' : 'Flag discrepancy',
          icon: Icon(flagged ? Icons.flag : Icons.outlined_flag, color: Colors.red),
          onPressed: busy ? null : () => setState(() { if (flagged) { discrepancies.remove(key); } else { discrepancies[key] = ''; checked.remove(key); } }))]),
        if (flagged) Padding(padding: const EdgeInsets.all(8), child: TextFormField(
          key: ValueKey('$rpc-$key-discrepancy'), initialValue: discrepancies[key],
          decoration: const InputDecoration(labelText: 'Describe the discrepancy', border: OutlineInputBorder()),
          maxLines: 2, onChanged: (value) => discrepancies[key] = value,
        )),
      ])); }),
      ],
      if (confirmationId.isEmpty && pages > 1) Row(children: [
        TextButton(onPressed: checklistPage > 0 ? () => setState(() => checklistPage--) : null, child: const Text('Previous')),
        Text('Page ${checklistPage + 1} of $pages'),
        TextButton(onPressed: checklistPage + 1 < pages ? () => setState(() => checklistPage++) : null, child: const Text('Next')),
      ]),
      if (items.isNotEmpty && confirmationId.isEmpty) Text('${checked.length} of ${items.length} checked · ${discrepancies.length} flagged'),
      if (items.isNotEmpty && confirmationId.isEmpty) FilledButton.icon(onPressed: busy || checked.length != items.length || discrepancies.isNotEmpty ? null : confirm, icon: const Icon(Icons.draw), label: const Text('Sign Pre-Flight confirmation')),
      if (items.isNotEmpty && confirmationId.isEmpty) OutlinedButton.icon(onPressed: busy ? null : () => confirm(allGood: false), icon: const Icon(Icons.save_outlined), label: Text(discrepancies.isEmpty ? 'Save checklist draft and continue' : 'Save draft with discrepancies')),
      if (confirmationId.isNotEmpty) ...[
        Text(confirmation['allGood'] == true ? 'Pre-Flight confirmation signed.' : 'Pre-Flight checklist draft saved. Resolve flagged items before release.'), const SizedBox(height: 8),
        DropdownButtonFormField<String>(initialValue: pilotId.isEmpty ? null : pilotId,
          decoration: const InputDecoration(labelText: 'Assigned pilot', border: OutlineInputBorder()),
          items: pilots.map((pilot) => DropdownMenuItem(value: flightText(pilot['userId']), child: Text(flightText(pilot['name'])))).toList(),
          onChanged: (value) => setState(() => pilotId = value ?? '')),
        const SizedBox(height: 8),
        TextField(controller: control, decoration: const InputDecoration(labelText: 'Control number (optional)', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        TextField(controller: date, decoration: const InputDecoration(labelText: 'Flight date (MM/DD/YYYY)', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        FilledButton.icon(onPressed: busy ? null : create, icon: const Icon(Icons.add), label: const Text('Create flight log')),
      ],
    ]));
  }
}
