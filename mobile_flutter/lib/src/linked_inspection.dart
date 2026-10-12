import 'package:flutter/material.dart';
import 'auth.dart';
import 'flight_logs.dart';
import 'flight_signing.dart';
import 'inspection_checklist.dart';

class LinkedInspectionPage extends StatefulWidget {
  const LinkedInspectionPage({super.key, required this.session, required this.flightId, required this.record, required this.kind, required this.editable});
  final AirmsSession session;
  final String flightId, kind;
  final bool editable;
  final Map<String, dynamic> record;
  @override State<LinkedInspectionPage> createState() => _LinkedInspectionPageState();
}
class _LinkedInspectionPageState extends State<LinkedInspectionPage> {
  List<Map<String, dynamic>> items = [];
  final checked = <String>{};
  Map<String, dynamic> discrepancies = {};
  final fob = TextEditingController(), notes = TextEditingController(), resolution = TextEditingController();
  bool busy = false;
  String error = '';
  @override void initState() {
    super.initState();
    fob.text = flightText(widget.record['fob']); notes.text = flightText(widget.record['notes']);
    discrepancies = flightMap(widget.record['discrepancies']);
    loadChecklist();
  }
  @override void dispose() { fob.dispose(); notes.dispose(); resolution.dispose(); super.dispose(); }
  Future<void> loadChecklist() async {
    final b412 = flightText(widget.record['aircraftType']).contains('412');
    try {
      final raw = await loadInspectionChecklist(widget.kind, flightText(widget.record['aircraftType']));
      if (mounted) { setState(() {
        items = raw;
        final checks = b412 ? flightMap(flightMap(widget.record['b412Data'])['checks']) : widget.record;
        checked.addAll(items.where((item) => checks[item['key']] == true).map((item) => '${item['key']}'));
      }); }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
  }
  Future<void> flag(String key) async {
    final previous = flightMap(discrepancies[key]);
    final note = TextEditingController(text: flightText(previous['note']));
    final result = await showDialog<String>(context: context, builder: (dialogContext) => AlertDialog(title: const Text('Flag discrepancy'),
      content: TextField(controller: note, maxLines: 3, decoration: const InputDecoration(labelText: 'Describe discrepancy')),
      actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(dialogContext, note.text.trim()), child: const Text('Save'))]));
    note.dispose();
    if (result != null && result.isNotEmpty) setState(() { discrepancies[key] = {'note': result, 'resolved': false, 'resolution': ''}; checked.remove(key); });
  }
  Future<void> resolve(String key) async {
    final previous = flightMap(discrepancies[key]);
    final note = TextEditingController(text: flightText(previous['resolution']));
    final result = await showDialog<String>(context: context, builder: (dialogContext) => AlertDialog(
      title: const Text('Resolve discrepancy'),
      content: TextField(controller: note, maxLines: 3, decoration: const InputDecoration(labelText: 'Corrective action taken')),
      actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(dialogContext, note.text.trim()), child: const Text('Resolve'))],
    ));
    note.dispose();
    if (result != null && result.isNotEmpty) {
      setState(() {
        discrepancies[key] = {...previous, 'resolved': true, 'resolution': result};
      });
    }
  }
  Future<void> submit(bool allGood) async {
    if (allGood && checked.length != items.length) { setState(() => error = 'Check every item before signing.'); return; }
    if (allGood && discrepancies.values.any((value) => flightMap(value)['resolved'] != true)) {
      setState(() => error = 'Resolve every flagged discrepancy before signing.'); return;
    }
    final signature = allGood ? await collectFlightSignature(context, widget.session) : null;
    if (allGood && signature == null) return;
    setState(() { busy = true; error = ''; });
    try {
      final changes = widget.kind == 'pre' ? {'fob': fob.text.trim()} : {'notes': notes.text.trim()};
      await widget.session.request('/api/flightlogs/${widget.flightId}/inspections/${widget.kind}/${widget.record['_id']}',
        method: 'PUT', body: {
          'changes': changes, 'expectedVersion': widget.record['__v'] ?? 0,
          'confirmation': {'allGood': allGood, 'checked': checked.toList(), 'discrepancies': discrepancies,
            'resolution': resolution.text.trim(), 'draft': !allGood, 'remarks': allGood ? '' : 'Checklist incomplete. Saved as a draft.'},
          if (signature != null) 'signature': signature.image, if (signature != null) 'pin': signature.pin,
          'confirmAction': true,
        }, extraHeaders: {'x-action-confirmed': 'true'});
      if (mounted) Navigator.pop(context, true);
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) {
    final canEdit = widget.editable && flightText(widget.record['status']) == 'pending';
    return Scaffold(appBar: AppBar(title: Text('${widget.kind == 'pre' ? 'Pre' : 'Post'}-Flight Inspection')),
      body: ListView(padding: const EdgeInsets.all(12), children: [
        Text('${widget.record['rpc'] ?? ''} · ${widget.record['aircraftType'] ?? ''}', style: Theme.of(context).textTheme.titleMedium),
        Text('Status: ${widget.record['status'] ?? ''}'),
        if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
        if (widget.kind == 'pre') TextField(controller: fob, enabled: canEdit, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Fuel on board', border: OutlineInputBorder())),
        if (widget.kind == 'post') TextField(controller: notes, enabled: canEdit, maxLines: 2, decoration: const InputDecoration(labelText: 'Notes', border: OutlineInputBorder())),
        const SizedBox(height: 12),
        for (var index = 0; index < items.length; index++) ...[
          if (index == 0 || items[index]['_section'] != items[index - 1]['_section'])
            Padding(padding: const EdgeInsets.only(top: 14, bottom: 6), child: Text('${items[index]['_section']}',
              style: Theme.of(context).textTheme.titleMedium)),
          Builder(builder: (context) { final item = items[index]; final key = '${item['key']}'; return Card(child: Column(children: [
          CheckboxListTile(value: checked.contains(key), title: Text('${item['title']}'), subtitle: Text('${item['description'] ?? ''}'),
            onChanged: canEdit && (!discrepancies.containsKey(key) || flightMap(discrepancies[key])['resolved'] == true)
              ? (value) => setState(() { if (value == true) { checked.add(key); } else { checked.remove(key); } }) : null),
          if (discrepancies.containsKey(key)) ListTile(title: Text('Discrepancy: ${flightMap(discrepancies[key])['note']}'),
            subtitle: Text(flightMap(discrepancies[key])['resolved'] == true
              ? 'Resolved: ${flightMap(discrepancies[key])['resolution'] ?? ''}' : 'Open')),
          if (canEdit && discrepancies.containsKey(key) && flightMap(discrepancies[key])['resolved'] != true)
            TextButton.icon(onPressed: () => resolve(key), icon: const Icon(Icons.check), label: const Text('Record corrective action')),
          if (canEdit) Row(mainAxisAlignment: MainAxisAlignment.end, children: [
            if (discrepancies.containsKey(key)) TextButton(onPressed: () => setState(() => discrepancies.remove(key)),
              child: const Text('Remove flag')),
            TextButton.icon(onPressed: () => flag(key), icon: const Icon(Icons.flag_outlined),
              label: Text(discrepancies.containsKey(key) ? 'Edit discrepancy' : 'Flag discrepancy')),
          ]),
        ])); }),
        ],
        if (canEdit) ...[
          TextField(controller: resolution, maxLines: 2, decoration: const InputDecoration(labelText: 'Resolution for earlier discrepancies')),
          OutlinedButton.icon(onPressed: busy ? null : () => submit(false), icon: const Icon(Icons.save_outlined), label: const Text('Save checklist draft')),
          FilledButton.icon(onPressed: busy || checked.length != items.length || items.isEmpty ? null : () => submit(true), icon: const Icon(Icons.draw), label: const Text('Sign and confirm inspection')),
        ],
      ]));
  }
}
