import 'dart:io';
import 'package:flutter/material.dart';
import 'search.dart';
import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import 'auth.dart';
import 'flight_logs.dart';
import 'flight_signing.dart';

class PartsMonitoringPage extends StatefulWidget {
  const PartsMonitoringPage({super.key, required this.session});
  final AirmsSession session;
  @override State<PartsMonitoringPage> createState() => _PartsMonitoringPageState();
}
class _PartsMonitoringPageState extends State<PartsMonitoringPage> {
  List<String> aircraft = [];
  Map<String, dynamic> record = {}, refs = {};
  List<Map<String, dynamic>> parts = [];
  String selected = '', search = '', error = '';
  String statusFilter = 'all';
  String activeTab = 'Overview';
  int componentPage = 0;
  static const componentPageSize = 8;
  String partStatus(Map<String, dynamic> part) {
    final due = flightText(part['due']).toLowerCase();
    final days = num.tryParse(flightText(part['daysRemaining']));
    final hours = num.tryParse(flightText(part['timeRemaining']));
    if (due.contains('due') || (days != null && days <= 0) || (hours != null && hours <= 0)) return 'Due';
    if ((days != null && days <= 30) || (hours != null && hours <= 30)) return 'Due Soon';
    return 'OK';
  }
  bool loading = false, saving = false;
  bool transferring = false;
  bool get canEdit => ['maintenance manager', 'admin staff'].contains(flightText(widget.session.user?['jobTitle']).toLowerCase());
  Future<Map<String, dynamic>> sendWorkbook(String path, PlatformFile file, {String? signature}) async {
    Future<http.Response> send() async {
      final request = http.MultipartRequest('POST', Uri.parse('$apiBase$path'));
      request.headers.addAll({...widget.session.headers(), 'x-action-confirmed': 'true'}..remove('Content-Type'));
      request.files.add(http.MultipartFile.fromBytes('workbook', await file.readAsBytes(), filename: file.name,
        contentType: MediaType.parse('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')));
      if (signature != null) {
        request.fields['approvalSignature'] = signature;
        request.fields['updatedBy'] = '${widget.session.user?['firstName'] ?? ''} ${widget.session.user?['lastName'] ?? ''}'.trim();
      }
      return http.Response.fromStream(await request.send());
    }
    var response = await send();
    if (response.statusCode == 401 && await widget.session.refresh() != null) response = await send();
    final data = decodeResponse(response);
    if (response.statusCode >= 400 || data['success'] == false) throw ApiException('${data['message'] ?? 'Workbook request failed'}');
    return data;
  }
  Future<void> importWorkbook() async {
    final files = await FilePicker.pickFiles(type: FileType.custom, allowedExtensions: ['xlsx', 'xlsm']);
    if (files.isEmpty) return;
    final file = files.first;
    setState(() { transferring = true; error = ''; });
    try {
      final response = await sendWorkbook('/api/parts-monitoring/preview-workbook', file);
      if (!mounted) return;
      final preview = flightMap(response['data']);
      final approved = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
        title: const Text('Preview aircraft workbook'),
        content: SizedBox(width: 440, child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Aircraft: ${preview['aircraft'] ?? ''}'), Text('Type: ${preview['aircraftType'] ?? ''}'),
          Text('Serial number: ${preview['serialNumber'] ?? ''}'), Text('Components: ${preview['partsCount'] ?? 0}'),
          for (final warning in response['warnings'] as List? ?? []) Text('$warning', style: const TextStyle(color: Colors.orange)),
          for (final issue in response['errors'] as List? ?? []) Text('$issue', style: const TextStyle(color: Colors.red)),
          for (final part in preview['parts'] as List? ?? []) Text('• ${flightMap(part)['componentName'] ?? ''}'),
        ]))),
        actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: (response['errors'] as List? ?? []).isNotEmpty ? null : () => Navigator.pop(context, true), child: const Text('Sign and import'))],
      ));
      if (approved != true || !mounted) return;
      final signed = await collectFlightSignature(context, widget.session);
      if (signed == null) return;
      final imported = await sendWorkbook('/api/parts-monitoring/import-workbook', file, signature: signed.image);
      final aircraftName = flightText(flightMap(imported['data'])['aircraft']);
      await loadAircraft();
      if (aircraftName.isNotEmpty) await select(aircraftName);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${imported['message'] ?? 'Aircraft imported'}')));
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => transferring = false); }
  }
  Future<void> exportWorkbook() async {
    setState(() { transferring = true; error = ''; });
    try {
      final uri = Uri.parse('$apiBase/api/parts-monitoring/${Uri.encodeComponent(selected)}/export-excel');
      var response = await http.get(uri, headers: widget.session.headers());
      if (response.statusCode == 401 && await widget.session.refresh() != null) response = await http.get(uri, headers: widget.session.headers());
      if (response.statusCode >= 400) throw ApiException('${decodeResponse(response)['message'] ?? 'Workbook export failed'}');
      final cache = await getTemporaryDirectory();
      final safeName = selected.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
      final file = File('${cache.path}${Platform.pathSeparator}parts_lifespan_$safeName.xlsx');
      await file.writeAsBytes(response.bodyBytes, flush: true);
      final opened = await OpenFile.open(file.path);
      if (opened.type != ResultType.done) throw ApiException(opened.message);
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => transferring = false); }
  }
  @override void initState() { super.initState(); loadAircraft(); }
  Future<void> loadAircraft() async {
    try {
      final result = await widget.session.request('/api/parts-monitoring/aircraft-list');
      if (mounted) setState(() => aircraft = (result['data'] as List? ?? []).map((item) => '$item').toList());
    } catch (e) { if (mounted) setState(() => error = '$e'); }
  }
  Future<void> select(String value, {bool resetView = true}) async {
    setState(() {
      selected = value; loading = true; error = '';
      if (resetView) { componentPage = 0; statusFilter = 'all'; activeTab = 'Overview'; search = ''; }
    });
    try {
      final result = await widget.session.request('/api/parts-monitoring/${Uri.encodeComponent(value)}');
      final data = flightMap(result['data']);
      if (mounted) setState(() { record = data; refs = flightMap(data['referenceData']); parts = (data['parts'] as List? ?? []).map(flightMap).toList(); });
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => loading = false); }
  }
  Future<void> save() async {
    setState(() { saving = true; error = ''; });
    try {
      await widget.session.request('/api/parts-monitoring/save', method: 'POST', body: {
        'aircraft': selected, 'aircraftType': record['aircraftType'], 'referenceData': refs,
        'parts': parts, 'confirmAction': true,
        'updatedBy': '${widget.session.user?['firstName'] ?? ''} ${widget.session.user?['lastName'] ?? ''}'.trim(),
      }, extraHeaders: {'x-action-confirmed': 'true'});
      await select(selected, resetView: false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Parts lifespan data saved')));
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => saving = false); }
  }
  Future<void> editPart(int index) async {
    final copy = {...parts[index]};
    final keys = ['hoursCW', 'timeSinceInstall', 'totalTimeSinceNew', 'ttCycleDue',
      'hourLimit1', 'hourLimit2', 'dayLimit', 'dayType', 'dateCW'];
    const labels = <String, String>{'hoursCW': 'HRS C/W', 'timeSinceInstall': 'Time Since Installation',
      'totalTimeSinceNew': 'Total Time Since New', 'ttCycleDue': 'TT/CYC Due',
      'hourLimit1': 'Hour Limit', 'hourLimit2': 'H/C/OC', 'dayLimit': 'Day Limit',
      'dayType': 'D/OC', 'dateCW': 'Date C/W'};
    final controllers = {for (final key in keys) key: TextEditingController(text: flightText(copy[key]))};
    final accepted = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: Text(flightText(copy['componentName']).isEmpty ? 'Component' : flightText(copy['componentName'])),
      content: SizedBox(width: 400, child: ListView(shrinkWrap: true, children: [
        Text('Days remaining: ${copy['daysRemaining'] ?? 'N/A'}'),
        Text('Time/cycles remaining: ${copy['timeRemaining'] ?? 'N/A'}'),
        Text('Date due: ${copy['dateDue'] ?? 'N/A'}'),
        Text('Due: ${copy['due'] ?? 'N/A'}'),
        for (final key in keys) Padding(padding: const EdgeInsets.symmetric(vertical: 5), child: TextField(
          controller: controllers[key], enabled: canEdit,
          readOnly: key == 'dateCW', keyboardType: ['dayType', 'hourLimit2', 'dateCW'].contains(key)
            ? TextInputType.text : const TextInputType.numberWithOptions(decimal: true),
          onTap: key == 'dateCW' && canEdit ? () async {
            final initial = DateTime.tryParse(controllers[key]!.text) ?? DateTime.now();
            final picked = await showDatePicker(context: context, initialDate: initial,
              firstDate: DateTime(1950), lastDate: DateTime(2100));
            if (picked != null) controllers[key]!.text = '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
          } : null,
          decoration: InputDecoration(labelText: labels[key], border: const OutlineInputBorder(),
            suffixIcon: key == 'dateCW' ? const Icon(Icons.calendar_today_outlined) : null),
        )),
      ])),
      actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Close')),
        if (canEdit) FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Save'))],
    ));
    if (accepted == true) {
      setState(() { for (final key in keys) { copy[key] = controllers[key]!.text; } parts[index] = copy; });
      await save();
    }
    for (final controller in controllers.values) { controller.dispose(); }
  }
  @override Widget build(BuildContext context) {
    final components = parts.asMap().entries.where((entry) => flightText(entry.value['rowType']).toLowerCase() != 'header').toList();
    final dueCount = components.where((entry) => partStatus(entry.value) == 'Due').length;
    final dueSoonCount = components.where((entry) => partStatus(entry.value) == 'Due Soon').length;
    final visible = components.where((entry) => matchesSearch(search, entry) && (statusFilter == 'all' || partStatus(entry.value).toLowerCase().replaceAll(' ', '') == statusFilter)).toList();
    final totalPages = (visible.length / componentPageSize).ceil();
    final currentPage = totalPages == 0 ? 0 : componentPage.clamp(0, totalPages - 1);
    return RefreshIndicator(onRefresh: () async { if (selected.isEmpty) { await loadAircraft(); } else { await select(selected, resetView: false); } }, child: ListView(padding: const EdgeInsets.all(12), children: [
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      DropdownButtonFormField<String>(initialValue: selected.isEmpty ? null : selected, decoration: const InputDecoration(labelText: 'Aircraft', border: OutlineInputBorder()), items: aircraft.map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(), onChanged: (value) { if (value != null) select(value); }),
      if (canEdit) OutlinedButton.icon(onPressed: transferring ? null : importWorkbook, icon: const Icon(Icons.upload_file), label: const Text('Add aircraft from workbook')),
      if (selected.isNotEmpty && parts.isNotEmpty) OutlinedButton.icon(onPressed: transferring ? null : exportWorkbook, icon: const Icon(Icons.file_download_outlined), label: const Text('Export workbook')),
      if (transferring) const LinearProgressIndicator(),
      if (loading) const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator())),
      if (selected.isNotEmpty && !loading) ...[
        SingleChildScrollView(scrollDirection: Axis.horizontal, child: SegmentedButton<String>(showSelectedIcon: false,
          segments: const [ButtonSegment(value: 'Overview', label: Text('Overview')),
            ButtonSegment(value: 'Components', label: Text('Components')),
            ButtonSegment(value: 'Reference', label: Text('Reference'))],
          selected: {activeTab}, onSelectionChanged: (values) => setState(() => activeTab = values.first))),
        Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (activeTab == 'Overview') ...[
            Text('Date manufactured: ${record['dateManufactured'] ?? 'N/A'}'),
            Text('Serial number: ${record['serialNumber'] ?? 'N/A'}'),
            Text('Creep damage: ${record['creepDamage'] ?? 'N/A'}'),
            Text('Tracked components: ${components.length}'),
            Text('Due: $dueCount · Due soon: $dueSoonCount'),
          ],
          Text('${record['aircraftType'] ?? ''} · $selected', style: Theme.of(context).textTheme.titleMedium),
          Text('Last updated: ${record['lastUpdated'] ?? '—'}'),
          if (activeTab == 'Reference') ExpansionTile(title: const Text('Reference data'), initiallyExpanded: true, children: refs.entries.where((entry) => entry.key != 'referenceCells').map((entry) => Padding(padding: const EdgeInsets.all(5), child: TextFormField(
            key: ValueKey('$selected-${entry.key}-${entry.key == 'today' ? entry.value : ''}'),
            initialValue: flightText(entry.value), enabled: canEdit, readOnly: entry.key == 'today',
            onTap: entry.key == 'today' && canEdit ? () async {
              final picked = await showDatePicker(context: context,
                initialDate: DateTime.tryParse(flightText(entry.value)) ?? DateTime.now(),
                firstDate: DateTime(1950), lastDate: DateTime(2100));
              if (picked != null && mounted) setState(() => refs['today'] = '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}');
            } : null,
            decoration: InputDecoration(labelText: entry.key, border: const OutlineInputBorder(),
              suffixIcon: entry.key == 'today' ? const Icon(Icons.calendar_today_outlined) : null),
            onChanged: (value) => refs[entry.key] = num.tryParse(value) ?? value,
          ))).toList()),
        ]))),
        if (activeTab == 'Components') ...[
        TextField(decoration: const InputDecoration(prefixIcon: Icon(Icons.search), labelText: 'Search components', border: OutlineInputBorder()), onChanged: (value) => setState(() { search = value; componentPage = 0; })),
        Wrap(spacing: 8, runSpacing: 8, children: [
          Chip(label: Text('Total: ${components.length}')),
          Chip(label: Text('Due: $dueCount')),
          Chip(label: Text('Due Soon: $dueSoonCount')),
          Chip(label: Text('OK: ${components.length - dueCount - dueSoonCount}')),
        ]),
        SingleChildScrollView(scrollDirection: Axis.horizontal, child: SegmentedButton<String>(showSelectedIcon: false, segments: [
          ButtonSegment(value: 'all', label: Text('All ${components.length}')),
          ButtonSegment(value: 'due', label: Text('Due $dueCount')),
          ButtonSegment(value: 'duesoon', label: Text('Soon $dueSoonCount')),
          ButtonSegment(value: 'ok', label: Text('OK ${components.length - dueCount - dueSoonCount}')),
        ], selected: {statusFilter}, onSelectionChanged: (values) => setState(() { statusFilter = values.first; componentPage = 0; }))),
        if (visible.isEmpty) const Padding(padding: EdgeInsets.all(12), child: Text('No components match the selected filter.')),
        ...visible.skip(currentPage * componentPageSize).take(componentPageSize).map((entry) { final part = entry.value; return Card(child: ListTile(
          title: Text(flightText(part['componentName']).isEmpty ? 'Section' : flightText(part['componentName'])),
          subtitle: Text('Remaining: ${part['timeRemaining'] ?? '—'} hours/cycles · ${part['daysRemaining'] ?? '—'} days\nDue: ${part['dateDue'] ?? '—'}'),
          isThreeLine: true, leading: Chip(label: Text(partStatus(part))), trailing: Icon(canEdit ? Icons.edit_outlined : Icons.chevron_right), onTap: () => editPart(entry.key),
        )); }),
        if (totalPages > 1) Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          IconButton(tooltip: 'Previous page', onPressed: currentPage > 0 ? () => setState(() => componentPage = currentPage - 1) : null, icon: const Icon(Icons.chevron_left)),
          Text('Page ${currentPage + 1} of $totalPages'),
          IconButton(tooltip: 'Next page', onPressed: currentPage + 1 < totalPages ? () => setState(() => componentPage = currentPage + 1) : null, icon: const Icon(Icons.chevron_right)),
        ]),
        ],
        if (canEdit) FilledButton.icon(onPressed: saving ? null : save, icon: const Icon(Icons.save), label: Text(saving ? 'Saving…' : 'Save parts lifespan data')),
      ],
    ]));
  }
}
