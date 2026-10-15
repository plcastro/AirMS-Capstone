import 'package:flutter/material.dart';
import 'auth.dart';
import 'flight_logs.dart';
import 'flight_signing.dart';
import 'inspection_checklist.dart';
import 'inspection_rules.dart';
import 'toast.dart';

class LinkedInspectionPage extends StatefulWidget {
  const LinkedInspectionPage({super.key, required this.session, required this.flightId, required this.record,
    required this.kind, required this.editable, required this.mechanic, required this.pilot, required this.flightStage});
  final AirmsSession session;
  final String flightId, kind;
  final bool editable;
  final bool mechanic, pilot;
  final String flightStage;
  final Map<String, dynamic> record;
  @override State<LinkedInspectionPage> createState() => _LinkedInspectionPageState();
}
class _LinkedInspectionPageState extends State<LinkedInspectionPage> {
  List<Map<String, dynamic>> items = [];
  final checked = <String>{};
  Map<String, dynamic> discrepancies = {};
  final fob = TextEditingController(), notes = TextEditingController(), resolution = TextEditingController();
  bool busy = false;
  int page = 0;
  String error = '';
  bool get held {
    final confirmation = flightMap(widget.record['confirmation']);
    return confirmation['allGood'] == false && confirmation['draft'] != true;
  }
  @override void initState() {
    super.initState();
    fob.text = flightText(widget.record['fob']); notes.text = flightText(widget.record['notes']);
    discrepancies = {for (final entry in flightMap(widget.record['discrepancies']).entries)
      if (flightMap(entry.value)['resolved'] != true)
        entry.key: {'note': flightText(flightMap(entry.value)['note'])}};
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
    if (result != null && result.isNotEmpty) setState(() { discrepancies[key] = {'note': result}; checked.remove(key); });
  }
  Future<void> submit(bool allGood) async {
    if (!allGood && discrepancies.values.any((value) => flightText(flightMap(value)['note']).trim().isEmpty)) {
      setState(() => error = 'Describe the discrepancy for each flagged item.'); AirmsToast.show(error); return;
    }
    if (allGood && !canSignInspection(items.length, checked, discrepancies.keys.toSet(),
        held: held, resolution: resolution.text)) {
      setState(() => error = 'Check every item and resolve flagged discrepancies before signing.');
      AirmsToast.show(error); return;
    }
    final signature = allGood ? await collectFlightSignature(context, widget.session) : null;
    if (allGood && signature == null) return;
    setState(() { busy = true; error = ''; });
    try {
      final changes = widget.kind == 'pre' ? {'fob': fob.text.trim()} : {'notes': notes.text.trim()};
      await widget.session.request('/api/flightlogs/${widget.flightId}/inspections/${widget.kind}/${widget.record['_id']}',
        method: 'PUT', body: {
          'changes': changes, 'expectedVersion': widget.record['__v'] ?? 0,
          'confirmation': {'allGood': allGood, 'checked': checked.toList(),
            'discrepancies': {for (final entry in discrepancies.entries)
              entry.key: {'note': flightText(flightMap(entry.value)['note']).trim()}},
            'resolution': resolution.text.trim(), 'draft': !allGood, 'remarks': allGood ? '' : 'Checklist incomplete. Saved as a draft.'},
          if (signature != null) 'signature': signature.image, if (signature != null) 'pin': signature.pin,
          'confirmAction': true,
        }, extraHeaders: {'x-action-confirmed': 'true'});
      if (mounted) Navigator.pop(context, true);
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> signStage(String nextStatus) async {
    final signed = await collectFlightSignature(context, widget.session);
    if (signed == null) return;
    setState(() { busy = true; error = ''; });
    try {
      await widget.session.request('/api/flightlogs/${widget.flightId}/inspections/${widget.kind}/${widget.record['_id']}',
        method: 'PUT', body: {
          'status': nextStatus,
          'expectedVersion': widget.record['__v'] ?? 0,
          'signature': signed.image,
          'pin': signed.pin,
          'confirmAction': true,
        }, extraHeaders: {'x-action-confirmed': 'true'});
      if (mounted) Navigator.pop(context, true);
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) {
    final canEdit = widget.editable && flightText(widget.record['status']) == 'pending';
    final recordStatus = flightText(widget.record['status']);
    final mayReleasePre = widget.kind == 'pre' && widget.mechanic && recordStatus == 'pending' &&
      ['pending_release', 'returned_to_mechanic'].contains(widget.flightStage);
    final mayAcceptPre = widget.kind == 'pre' && widget.pilot && recordStatus == 'released' &&
      widget.flightStage == 'pending_acceptance';
    final mayCompletePost = widget.kind == 'post' && widget.mechanic && recordStatus == 'pending' &&
      ['accepted', 'submitted', 'returned_to_pilot'].contains(widget.flightStage);
    final pages = (items.length / inspectionPageSize).ceil().clamp(1, 99999);
    final visible = items.skip(page * inspectionPageSize).take(inspectionPageSize).toList();
    final flagged = discrepancies.keys.toSet();
    void updateChecks(Iterable<String> keys, bool value) => setState(() {
      final next = setInspectionChecks(keys, checked, flagged, value);
      checked..clear()..addAll(next);
    });
    return Scaffold(appBar: AppBar(title: Text('${widget.kind == 'pre' ? 'Pre' : 'Post'}-Flight Inspection')),
      body: ListView(padding: const EdgeInsets.all(12), children: [
        Text('${widget.record['rpc'] ?? ''} · ${widget.record['aircraftType'] ?? ''}', style: Theme.of(context).textTheme.titleMedium),
        Text('Status: ${widget.record['status'] ?? ''}'),
        if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
        if (widget.kind == 'pre') TextField(controller: fob, enabled: canEdit, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Fuel on board', border: OutlineInputBorder())),
        if (widget.kind == 'post') TextField(controller: notes, enabled: canEdit, maxLines: 2, decoration: const InputDecoration(labelText: 'Notes', border: OutlineInputBorder())),
        const SizedBox(height: 12),
        if (canEdit) Wrap(spacing: 6, children: [
          OutlinedButton(onPressed: () => updateChecks(items.map((item) => '${item['key']}'), true), child: const Text('Mark all items good')),
          OutlinedButton(onPressed: () => updateChecks(items.map((item) => '${item['key']}'), false), child: const Text('Clear all')),
          OutlinedButton(onPressed: () => updateChecks(visible.map((item) => '${item['key']}'), true), child: const Text('Select all on this page')),
          OutlinedButton(onPressed: () => updateChecks(visible.map((item) => '${item['key']}'), false), child: const Text('Clear this page')),
        ]),
        Text('${checked.length} of ${items.length} items checked${flagged.isEmpty ? '' : ' · ${flagged.length} flagged'}'),
        for (var index = 0; index < visible.length; index++) ...[
          if (index == 0 || visible[index]['_section'] != visible[index - 1]['_section'])
            Padding(padding: const EdgeInsets.only(top: 14, bottom: 6), child: Text('${visible[index]['_section']}',
              style: Theme.of(context).textTheme.titleMedium)),
          Builder(builder: (context) { final item = visible[index]; final key = '${item['key']}'; return Card(child: Column(children: [
          CheckboxListTile(value: checked.contains(key), title: Text('${item['title']}'), subtitle: Text('${item['description'] ?? ''}'),
            onChanged: canEdit && !discrepancies.containsKey(key)
              ? (value) => setState(() { if (value == true) { checked.add(key); } else { checked.remove(key); } }) : null),
          if (discrepancies.containsKey(key)) ListTile(title: Text('Discrepancy: ${flightMap(discrepancies[key])['note']}'),
            subtitle: const Text('Flagged; remove flag after correction')),
          if (canEdit) Row(mainAxisAlignment: MainAxisAlignment.end, children: [
            if (discrepancies.containsKey(key)) TextButton(onPressed: () => setState(() => discrepancies.remove(key)),
              child: const Text('Remove flag')),
            TextButton.icon(onPressed: () => flag(key), icon: const Icon(Icons.flag_outlined),
              label: Text(discrepancies.containsKey(key) ? 'Edit discrepancy' : 'Flag discrepancy')),
          ]),
        ])); }),
        ],
        if (pages > 1) Row(children: [
          TextButton(onPressed: page > 0 ? () => setState(() => page--) : null, child: const Text('Previous')),
          Text('Page ${page + 1} of $pages'),
          TextButton(onPressed: page + 1 < pages ? () => setState(() => page++) : null, child: const Text('Next')),
        ]),
        if (canEdit) ...[
          if (held) TextField(controller: resolution, maxLines: 2, onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(labelText: 'Describe how the discrepancies were resolved')),
          OutlinedButton.icon(onPressed: busy ? null : () => submit(false), icon: const Icon(Icons.save_outlined),
            label: Text(flagged.isEmpty ? 'Save draft' : 'Save draft with discrepancies')),
          FilledButton.icon(onPressed: busy || !canSignInspection(items.length, checked, flagged,
            held: held, resolution: resolution.text) ? null : () => submit(true),
            icon: const Icon(Icons.draw), label: const Text('Sign and confirm')),
        ],
        if (mayReleasePre || mayAcceptPre || mayCompletePost) FilledButton.icon(
          onPressed: busy ? null : () => signStage(mayReleasePre ? 'released' : 'completed'),
          icon: const Icon(Icons.draw),
          label: Text(mayReleasePre ? 'Sign and release Pre-Flight' :
            mayAcceptPre ? 'Sign and accept Pre-Flight' : 'Sign and complete Post-Flight')),
      ]));
  }
}
