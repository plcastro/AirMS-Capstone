import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import 'auth.dart';
import 'flight_logs.dart';
import 'flight_signing.dart';
import 'search.dart';
import 'toast.dart';

const referenceFields = <(String, String)>[
  ('engTT', 'Engine Cycle'), ('today', 'Date'), ('n1Cycles', 'N1'),
  ('n2Cycles', 'N2'), ('acftTT', 'Acft. TT'), ('landings', 'Landings'),
  ('usage', 'Sling'),
];
const previewColumns = <(String, String, double)>[
  ('componentName', 'Component', 230), ('hourLimit1', 'Hour Limit', 90),
  ('hourLimit2', 'H/C/OC', 90), ('dayLimit', 'Day Limit', 90),
  ('dayType', 'D/OC', 80), ('dateCW', 'Date C/W', 110),
  ('hoursCW', 'HRS C/W', 90), ('daysRemaining', 'Days Remaining', 120),
  ('timeRemaining', 'Time/Cyc Remaining', 140), ('dateDue', 'Date Due', 110),
  ('ttCycleDue', 'TT/Cyc Due', 110), ('due', 'Due', 80), ('hd', 'H/D', 80),
  ('timeSinceInstall', 'Time Since Install', 150),
  ('totalTimeSinceNew', 'Total Time Since New', 150),
];
const partFields = <(String, String, bool)>[
  ('hoursCW', 'HRS C/W', true),
  ('timeSinceInstall', 'Time Since Installation', true),
  ('totalTimeSinceNew', 'Total Time Since New', true),
  ('ttCycleDue', 'TT/CYC Due', true),
  ('hourLimit1', 'Hour Limit', true),
  ('hourLimit2', 'H/C/OC', false),
  ('dayLimit', 'Day Limit', true),
  ('dayType', 'D/OC', false),
];

String lifespanDate(Object? value) {
  if (value == null || '$value'.isEmpty) return 'N/A';
  final date = DateTime.tryParse('$value');
  if (date == null) return '$value';
  return '${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}/${(date.year % 100).toString().padLeft(2, '0')}';
}

String creepDamage(Object? value) {
  if (value == null || '$value'.isEmpty) return 'N/A';
  final parsed = num.tryParse('$value'.replaceAll('%', '').trim());
  if (parsed == null || parsed < 0 || parsed > 100) return 'N/A';
  return '${(parsed * 100).round() / 100 == parsed ? parsed : (parsed * 100).round() / 100}%'
      .replaceFirst(RegExp(r'\.0%$'), '%');
}

String partStatus(Map<String, dynamic> part) {
  final due = '${part['due'] ?? ''}'.toLowerCase();
  // JavaScript Number(undefined) is NaN, while Number(null) and Number('') are zero.
  num? number(Object? value) => value == null || '$value'.trim().isEmpty
      ? 0 : num.tryParse('$value');
  final days = part.containsKey('daysRemaining') ? number(part['daysRemaining']) : null;
  final hours = part.containsKey('timeRemaining') ? number(part['timeRemaining']) : null;
  if (due.contains('due') || (days != null && days <= 0) ||
      (hours != null && hours <= 0)) {
    return 'Due';
  }
  if ((days != null && days <= 30) || (hours != null && hours <= 30)) {
    return 'Due Soon';
  }
  return 'OK';
}

Map<String, dynamic> normalizeReferences(Map<String, dynamic> source) {
  final today = DateTime.tryParse('${source['today'] ?? ''}') ?? DateTime.now().toUtc();
  return {
    ...source,
    'today': '${today.year.toString().padLeft(4, '0')}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}',
    'acftTT': source['acftTT'] ?? 0,
    'engTT': source['engTT'] ?? source['acftTT'] ?? 0,
    'n1Cycles': source['n1Cycles'] ?? 0,
    'n2Cycles': source['n2Cycles'] ?? 0,
    'landings': source['landings'] ?? 0,
    'referenceCells': source['referenceCells'] ?? <String, dynamic>{},
  };
}

class PartsMonitoringPage extends StatefulWidget {
  const PartsMonitoringPage({super.key, required this.session});
  final AirmsSession session;
  @override
  State<PartsMonitoringPage> createState() => _PartsMonitoringPageState();
}

class _PartsMonitoringPageState extends State<PartsMonitoringPage> {
  List<String> aircraft = [];
  Map<String, dynamic> record = {}, refs = normalizeReferences({});
  List<Map<String, dynamic>> parts = [];
  String selected = '', search = '', error = '', editorMessage = '';
  String statusFilter = 'all', activeTab = 'overview';
  int componentPage = 0;
  bool loadingAircraft = false, loading = false, saving = false;
  bool previewing = false, importing = false, exporting = false;
  bool dropdownOpen = false;
  PlatformFile? pendingFile;
  Map<String, dynamic>? preview;
  List<dynamic> warnings = [], importErrors = [];
  static const pageSize = 10;
  bool get canEdit {
    final user = widget.session.user ?? {};
    final role = '${user['jobTitle'] ?? user['access'] ?? ''}'.trim().toLowerCase();
    return role == 'maintenance manager' || role == 'admin staff';
  }
  String get updatedBy {
    final user = widget.session.user;
    if (user == null) return 'mobile user';
    return '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim();
  }
  @override
  void initState() { super.initState(); loadAircraft(); }

  Future<void> loadAircraft() async {
    setState(() => loadingAircraft = true);
    try {
      final result = await widget.session.request('/api/parts-monitoring/aircraft-list');
      if (mounted) {
        setState(() => aircraft = result['success'] == true
            ? (result['data'] as List? ?? []).map((value) => '$value').toList() : []);
      }
    } catch (_) {
      if (mounted) setState(() => aircraft = []);
    } finally {
      if (mounted) setState(() => loadingAircraft = false);
    }
  }

  Future<void> select(String value) async {
    setState(() {
      selected = value; dropdownOpen = false; componentPage = 0; editorMessage = ''; error = '';
      if (value.isEmpty) { refs = normalizeReferences({}); parts = []; record = {}; loading = false; }
      else { loading = true; }
    });
    if (value.isEmpty) return;
    try {
      final result = await widget.session.request('/api/parts-monitoring/${Uri.encodeComponent(value)}');
      if (result['success'] != true || result['data'] == null) {
        throw ApiException('${result['message'] ?? 'No saved data found for this aircraft'}');
      }
      if (!mounted || selected != value) return;
      final data = flightMap(result['data']);
      setState(() {
        record = data;
        refs = normalizeReferences(flightMap(data['referenceData']));
        parts = (data['parts'] as List? ?? []).map(flightMap).toList();
      });
    } catch (e) {
      if (mounted && selected == value) {
        setState(() { parts = []; record = {}; error = '$e'; });
        AirmsToast.show('$e');
      }
    } finally {
      if (mounted && selected == value) setState(() => loading = false);
    }
  }

  Future<void> save() async {
    if (selected.isEmpty) { AirmsToast.show('Select an aircraft before saving.'); return; }
    final approved = await showDialog<bool>(context: context, builder: (dialog) => AlertDialog(
      title: const Text('Save Parts Lifespan Data'),
      content: Text('Save current parts lifespan values for $selected?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(dialog, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(dialog, true), child: const Text('Save')),
      ],
    ));
    if (approved != true || !mounted) return;
    setState(() { saving = true; editorMessage = ''; });
    try {
      final body = {
        'aircraft': selected, 'aircraftType': record['aircraftType'],
        'referenceData': {...refs, 'today': DateTime.tryParse('${refs['today'] ?? ''}')?.toUtc().toIso8601String() ?? refs['today']},
        'parts': parts, 'confirmAction': true, 'updatedBy': updatedBy,
      };
      final result = await widget.session.request('/api/parts-monitoring/save',
        method: 'POST', body: body, extraHeaders: {'x-action-confirmed': 'true'});
      if (result['success'] != true) throw ApiException('${result['message'] ?? 'Failed to save data'}');
      if (mounted) setState(() => editorMessage = 'Parts lifespan data saved.');
    } catch (e) {
      if (mounted) AirmsToast.show('$e');
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Future<Map<String, dynamic>> sendWorkbook(String path, PlatformFile file, {String? signature}) async {
    Future<http.Response> send() async {
      final request = http.MultipartRequest('POST', Uri.parse('$apiBase$path'));
      request.headers.addAll(widget.session.headers()..remove('Content-Type'));
      request.files.add(http.MultipartFile.fromBytes('workbook', await file.readAsBytes(),
        filename: file.name, contentType: MediaType.parse(
          file.extension?.toLowerCase() == 'xlsm'
              ? 'application/vnd.ms-excel.sheet.macroEnabled.12'
              : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')));
      if (signature != null) {
        request.fields['approvalSignature'] = signature;
        request.fields['updatedBy'] = updatedBy;
      }
      return http.Response.fromStream(await request.send());
    }
    var response = await send();
    if (response.statusCode == 401 && await widget.session.refresh() != null) response = await send();
    final data = decodeResponse(response);
    if (response.body.isEmpty) throw const ApiException('The server returned an invalid workbook response.');
    if (response.statusCode >= 400 || data['success'] != true) {
      throw ApiException('${data['message'] ?? 'Workbook upload failed (${response.statusCode}).'}');
    }
    return data;
  }

  Future<void> previewWorkbook() async {
    if (!canEdit) { AirmsToast.show('Only maintenance managers and Admin Staff can add aircraft.'); return; }
    final files = await FilePicker.pickFiles(type: FileType.custom, allowedExtensions: ['xlsx', 'xlsm']);
    if (files.isEmpty) return;
    final file = files.first;
    setState(() => previewing = true);
    try {
      final result = await sendWorkbook('/api/parts-monitoring/preview-workbook', file);
      if (mounted) {
        setState(() {
          pendingFile = file; preview = flightMap(result['data']);
          warnings = result['warnings'] as List? ?? [];
          importErrors = result['errors'] as List? ?? [];
        });
      }
    } catch (e) {
      if (mounted) { setState(clearPreview); AirmsToast.show('$e'); }
    } finally {
      if (mounted) setState(() => previewing = false);
    }
  }
  void clearPreview() {
    pendingFile = null; preview = null; warnings = []; importErrors = [];
  }
  Future<void> confirmImport() async {
    final file = pendingFile;
    if (file == null) { AirmsToast.show('Select a workbook before adding aircraft.'); return; }
    final signed = await collectFlightSignature(context, widget.session);
    if (signed == null || !mounted) return;
    setState(() => importing = true);
    try {
      final result = await sendWorkbook('/api/parts-monitoring/import-workbook', file, signature: signed.image);
      final name = flightText(flightMap(result['data'])['aircraft']);
      if (!mounted) return;
      setState(clearPreview);
      await loadAircraft();
      if (name.isNotEmpty) await select(name);
      AirmsToast.show('${result['message'] ?? 'Aircraft imported successfully.'}');
    } catch (e) {
      if (mounted) AirmsToast.show('$e');
    } finally {
      if (mounted) setState(() => importing = false);
    }
  }

  Future<void> exportWorkbook() async {
    if (selected.isEmpty || loading || exporting || parts.isEmpty) return;
    setState(() => exporting = true);
    try {
      final uri = Uri.parse('$apiBase/api/parts-monitoring/${Uri.encodeComponent(selected)}/export-excel');
      var response = await http.get(uri, headers: widget.session.headers());
      if (response.statusCode == 401 && await widget.session.refresh() != null) {
        response = await http.get(uri, headers: widget.session.headers());
      }
      if (response.statusCode >= 400) throw ApiException('${decodeResponse(response)['message'] ?? 'Workbook export failed'}');
      final cache = await getTemporaryDirectory();
      final safe = selected.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
      final file = File('${cache.path}${Platform.pathSeparator}parts_lifespan_$safe.xlsx');
      await file.writeAsBytes(response.bodyBytes, flush: true);
      final opened = await OpenFile.open(file.path);
      if (opened.type != ResultType.done) throw ApiException(opened.message);
    } catch (e) {
      if (mounted) AirmsToast.show('$e');
    } finally {
      if (mounted) setState(() => exporting = false);
    }
  }

  Future<void> pickDate(Object? current, void Function(String) update) async {
    if (!canEdit) return;
    final date = await showDatePicker(context: context,
      initialDate: DateTime.tryParse('${current ?? ''}') ?? DateTime.now(),
      firstDate: DateTime(1900), lastDate: DateTime(2200));
    if (date != null && mounted) {
      setState(() => update(
        '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}'));
    }
  }

  Widget field(String label, Object? value) => SizedBox(width: 150, child: Padding(
    padding: const EdgeInsets.only(right: 12, bottom: 10),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
      Text(value == null || '$value'.isEmpty ? 'N/A' : '$value',
        style: const TextStyle(fontWeight: FontWeight.w700)),
    ]),
  ));
  Widget fields(List<(String, Object?)> values) => Wrap(children: [
    for (final value in values) field(value.$1, value.$2),
  ]);
  Widget input(String label, String value, void Function(String) changed,
      {bool numeric = true, bool date = false}) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: TextFormField(
      key: ValueKey('$selected-$label-${date ? value : ''}'),
      initialValue: date ? lifespanDate(value) : value,
      enabled: canEdit, readOnly: date,
      keyboardType: numeric ? const TextInputType.numberWithOptions(decimal: true) : TextInputType.text,
      onTap: date ? () => pickDate(value, changed) : null,
      onChanged: date ? null : changed,
      decoration: InputDecoration(labelText: label, border: const OutlineInputBorder(),
        suffixIcon: date ? const Icon(Icons.calendar_today_outlined) : null),
    ),
  );
  Color statusColor(String value) => switch (value) {
    'Due' => const Color(0xffcf1322), 'Due Soon' => const Color(0xffd46b08),
    _ => const Color(0xff237e99),
  };
  Widget statusChip(String status) => Chip(label: Text(status,
    style: TextStyle(color: statusColor(status), fontWeight: FontWeight.bold)),
    side: BorderSide(color: statusColor(status)), backgroundColor: Colors.white);

  Future<void> showPart(int index) async {
    editorMessage = '';
    await showModalBottomSheet<void>(context: context, isScrollControlled: true,
      backgroundColor: Colors.transparent, builder: (sheetContext) => StatefulBuilder(
        builder: (context, updateSheet) {
          final part = parts[index];
          void change(String key, String value) {
            setState(() => parts[index] = {...parts[index], key: value});
            updateSheet(() {});
          }
          return Container(
            constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * .88),
            decoration: const BoxDecoration(color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(14))),
            padding: EdgeInsets.fromLTRB(14, 10, 14, MediaQuery.paddingOf(context).bottom + 12),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(4))),
              Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(flightText(part['componentName']).isEmpty ? 'Unnamed component' : flightText(part['componentName']),
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xff123f5a))),
                  Text(flightText(part['hd']).isEmpty ? 'Component interval' : flightText(part['hd']),
                    style: const TextStyle(fontSize: 11, color: Colors.grey)),
                ])),
                statusChip(partStatus(part)),
              ]),
              Flexible(child: ListView(shrinkWrap: true, children: [
                fields([('Days Remaining', part['daysRemaining']),
                  ('Time/Cyc Remaining', part['timeRemaining']),
                  ('Date Due', lifespanDate(part['dateDue'])), ('Due', part['due'])]),
                for (final spec in partFields) input(spec.$2, flightText(part[spec.$1]),
                  (value) => change(spec.$1, value), numeric: spec.$3),
                ListTile(title: const Text('Date C/W'), subtitle: Text(lifespanDate(part['dateCW'])),
                  enabled: canEdit, trailing: const Icon(Icons.calendar_today_outlined),
                  onTap: () async {
                    await pickDate(part['dateCW'], (value) => change('dateCW', value));
                    updateSheet(() {});
                  }),
              ])),
              Row(children: [
                Expanded(child: FilledButton(style: FilledButton.styleFrom(backgroundColor: Colors.grey),
                  onPressed: () => Navigator.pop(sheetContext), child: const Text('Close'))),
                if (canEdit) ...[
                  const SizedBox(width: 8),
                  Expanded(child: FilledButton(onPressed: saving ? null : () async {
                    await save(); if (mounted) updateSheet(() {});
                  }, child: Text(saving ? 'Saving...' : 'Save'))),
                ],
              ]),
              if (editorMessage.isNotEmpty) Text(editorMessage,
                style: const TextStyle(color: Colors.green, fontWeight: FontWeight.w600)),
            ]),
          );
        }));
  }

  Widget previewDialog() {
    final data = preview!;
    final previewParts = (data['parts'] as List? ?? []).map(flightMap).toList();
    return Dialog(child: Padding(padding: const EdgeInsets.all(16),
      child: ConstrainedBox(constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * .86),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Preview Aircraft Import', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
          Flexible(child: SingleChildScrollView(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start, children: [
              for (final issue in importErrors) warningBox('$issue', true),
              for (final warning in warnings) warningBox('$warning', false),
              const SizedBox(height: 12),
              Card(child: Padding(padding: const EdgeInsets.all(10), child: fields([
                ('Aircraft', data['aircraft']),
                ('Date Manufactured', lifespanDate(data['dateManufactured'])),
                ('Acft. Type', '${data['aircraftType'] ?? 'N/A'}${data['serialNumber'] == null || data['serialNumber'] == '' ? '' : ' SN: ${data['serialNumber']}'}'),
                ('Creep Damage', creepDamage(data['creepDamage'])),
              ]))),
              Card(child: Padding(padding: const EdgeInsets.all(10), child: fields([
                for (final spec in referenceFields) (spec.$2,
                  spec.$1 == 'today' ? lifespanDate(flightMap(data['referenceData'])[spec.$1])
                    : flightMap(data['referenceData'])[spec.$1]),
              ]))),
              const Padding(padding: EdgeInsets.symmetric(vertical: 10),
                child: Text('Parts Lifespan Table', style: TextStyle(fontWeight: FontWeight.bold))),
              if (data['previewTruncated'] == true) Text(
                'Showing the first ${data['previewRowCount']} rows to keep the preview responsive. All ${data['partsCount']} rows will be imported.',
                style: const TextStyle(color: Color(0xff8a5a00))),
              SingleChildScrollView(scrollDirection: Axis.horizontal, child: Table(
                defaultColumnWidth: const IntrinsicColumnWidth(),
                border: TableBorder.all(color: Colors.grey.shade300),
                children: [
                  TableRow(decoration: const BoxDecoration(color: Color(0xffe2f0d9)),
                    children: [for (final column in previewColumns)
                      tableCell(column.$2, column.$3, true)]),
                  for (var i = 0; i < previewParts.length; i++)
                    TableRow(decoration: BoxDecoration(color: previewParts[i]['rowType'] == 'header'
                        ? const Color(0xffb6d7a8) : i.isEven ? Colors.white : const Color(0xfffafafa)),
                      children: [for (final column in previewColumns)
                        tableCell('${previewParts[i][column.$1] ?? ''}', column.$3,
                          previewParts[i]['rowType'] == 'header')]),
                ],
              )),
            ]))),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: FilledButton(style: FilledButton.styleFrom(backgroundColor: Colors.grey),
              onPressed: () => setState(clearPreview), child: const Text('Discard'))),
            const SizedBox(width: 8),
            Expanded(child: FilledButton(onPressed: importErrors.isNotEmpty || importing ? null : confirmImport,
              child: const Text('Confirm and Sign'))),
          ]),
        ]))));
  }
  Widget warningBox(String value, bool issue) => Container(
    width: double.infinity, margin: const EdgeInsets.only(top: 10), padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(color: issue ? const Color(0xfffff1f0) : const Color(0xfffffbe6),
      border: Border.all(color: issue ? const Color(0xffffa39e) : const Color(0xffffe58f)),
      borderRadius: BorderRadius.circular(8)),
    child: Text(value, style: TextStyle(fontWeight: FontWeight.bold,
      color: issue ? const Color(0xffcf1322) : const Color(0xffad6800))));
  Widget tableCell(String value, double width, bool bold) => SizedBox(
    width: width, child: Padding(padding: const EdgeInsets.all(6), child: Text(value,
      maxLines: 3, overflow: TextOverflow.ellipsis, style: TextStyle(
        fontSize: 11, fontWeight: bold ? FontWeight.w800 : FontWeight.normal))));

  @override
  Widget build(BuildContext context) {
    final components = parts.asMap().entries.where((entry) => entry.value['rowType'] != 'header').toList();
    final due = components.where((entry) => partStatus(entry.value) == 'Due').length;
    final soon = components.where((entry) => partStatus(entry.value) == 'Due Soon').length;
    final visible = components.where((entry) => matchesSearch(search, {...entry.value, '__sourceIndex': entry.key}) &&
      (statusFilter == 'all' || partStatus(entry.value).toLowerCase().replaceAll(' ', '') == statusFilter)).toList();
    final pages = (visible.length / pageSize).ceil().clamp(1, 999999).toInt();
    final page = componentPage.clamp(0, pages - 1).toInt();
    Widget card(Widget child) => Card(color: Colors.white, child: Padding(
      padding: const EdgeInsets.all(12), child: child));
    return Stack(children: [
      RefreshIndicator(onRefresh: () => selected.isEmpty ? loadAircraft() : select(selected),
        child: ListView(padding: const EdgeInsets.all(12), children: [
          card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Parts Lifespan Monitoring', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const Text('Aircraft component status'),
            const SizedBox(height: 10),
            OutlinedButton.icon(onPressed: loadingAircraft ? null : () => setState(() => dropdownOpen = !dropdownOpen),
              icon: const Icon(Icons.tune, size: 16),
              label: Expanded(child: Text(loadingAircraft ? 'Loading aircraft...' :
                selected.isEmpty ? 'Choose an aircraft' : 'RP/C: $selected')),
            ),
            if (dropdownOpen) Container(
              constraints: const BoxConstraints(maxHeight: 300),
              decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade300),
                borderRadius: BorderRadius.circular(10)), child: ListView(shrinkWrap: true, children: [
                ListTile(title: const Text('Choose an aircraft'), onTap: () => select('')),
                if (aircraft.isEmpty) const ListTile(title: Text('No aircraft available')),
                for (final name in aircraft) ListTile(title: Text('RP/C: $name'),
                  onTap: () => select(name)),
              ])),
            if (canEdit) SizedBox(width: double.infinity, child: FilledButton.icon(
              onPressed: previewing || importing ? null : previewWorkbook,
              icon: previewing || importing ? const SizedBox(width: 18, height: 18,
                child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.table_chart),
              label: Text(previewing ? 'Previewing...' : importing ? 'Importing...' : 'Add Aircraft'))),
            SizedBox(width: double.infinity, child: FilledButton.icon(
              onPressed: selected.isEmpty || loading || exporting || parts.isEmpty ? null : exportWorkbook,
              icon: exporting ? const SizedBox(width: 18, height: 18,
                child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.file_download_outlined),
              label: Text(exporting ? 'Exporting...' : 'Export'))),
          ])),
          if (selected.isNotEmpty) Padding(padding: const EdgeInsets.symmetric(vertical: 8),
            child: Wrap(spacing: 8, runSpacing: 8, children: [
              for (final chip in [
                ('due', 'Due', due), ('duesoon', 'Due Soon', soon),
                ('ok', 'OK', components.length - due - soon),
                ('all', 'Total', components.length),
              ]) InkWell(onTap: () => setState(() {
                statusFilter = chip.$1; activeTab = 'components'; componentPage = 0;
              }), child: Container(width: MediaQuery.sizeOf(context).width * .43,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: statusColor(chip.$2 == 'Total' ? 'Total' : chip.$2))),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${chip.$3}', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800,
                    color: statusColor(chip.$2))),
                  Text(chip.$2.toUpperCase(), style: const TextStyle(fontSize: 11,
                    fontWeight: FontWeight.w700, color: Colors.grey)),
                ]))),
            ])),
          TextField(decoration: const InputDecoration(prefixIcon: Icon(Icons.search),
            hintText: 'Search components', border: OutlineInputBorder()),
            onChanged: (value) => setState(() { search = value; componentPage = 0; })),
          if (selected.isNotEmpty) Padding(padding: const EdgeInsets.symmetric(vertical: 10),
            child: SegmentedButton<String>(showSelectedIcon: false,
              segments: const [
                ButtonSegment(value: 'overview', label: Text('Overview')),
                ButtonSegment(value: 'components', label: Text('Components')),
                ButtonSegment(value: 'reference', label: Text('Reference')),
              ], selected: {activeTab},
              onSelectionChanged: (value) => setState(() => activeTab = value.first))),
          if (loading) const Center(child: Padding(padding: EdgeInsets.all(20),
            child: CircularProgressIndicator())),
          if (!loading && selected.isEmpty) card(const Text('Select an aircraft to view components.')),
          if (!loading && selected.isNotEmpty && activeTab == 'overview') card(Column(
            crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(selected, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              Text(flightText(record['aircraftType']).isEmpty ? 'Aircraft details' : flightText(record['aircraftType'])),
              const SizedBox(height: 10),
              fields([('Date Manufactured', lifespanDate(record['dateManufactured'])),
                ('Serial Number', record['serialNumber']), ('Creep Damage', creepDamage(record['creepDamage'])),
                ('Tracked Components', components.length), ('Due', due), ('Due Soon', soon)]),
            ])),
          if (!loading && selected.isNotEmpty && activeTab == 'reference') card(Column(
            crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Reference Values', style: TextStyle(fontWeight: FontWeight.w800)),
              const Text('Used by web formulas and saved workbook data'),
              const SizedBox(height: 10),
              for (final spec in referenceFields) input(
                record['aircraftType'].toString().toUpperCase().contains('412')
                    ? switch (spec.$1) {
                        'engTT' => 'Engine No. 1 TSN',
                        'n1Cycles' => 'Engine No. 1 Cycle',
                        'n2Cycles' => 'Engine No. 2 Cycle', _ => spec.$2,
                      } : spec.$2,
                flightText(refs[spec.$1]),
                (value) => setState(() => refs[spec.$1] = value),
                date: spec.$1 == 'today'),
              if (canEdit) SizedBox(width: double.infinity,
                child: FilledButton.icon(onPressed: saving ? null : save,
                  icon: const Icon(Icons.save), label: Text(saving ? 'Saving...' : 'Save to Database'))),
            ])),
          if (!loading && selected.isNotEmpty && activeTab == 'components') ...[
            SingleChildScrollView(scrollDirection: Axis.horizontal,
              child: Row(children: [
                for (final option in [('all', 'All', components.length), ('due', 'Due', due),
                  ('duesoon', 'Due Soon', soon), ('ok', 'OK', components.length - due - soon)])
                  Padding(padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(label: Text('${option.$2} ${option.$3}'),
                      selected: statusFilter == option.$1,
                      onSelected: (_) => setState(() { statusFilter = option.$1; componentPage = 0; }))),
              ])),
            if (visible.isEmpty) card(const Text('No component rows found.')),
            if (visible.isNotEmpty) Text('Showing ${page * pageSize + 1}-${((page + 1) * pageSize).clamp(0, visible.length)} of ${visible.length}',
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.grey)),
            for (final entry in visible.skip(page * pageSize).take(pageSize)) InkWell(
              onTap: () => showPart(entry.key), child: card(Column(children: [
                Row(children: [
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(flightText(entry.value['componentName']).isEmpty
                      ? 'Unnamed component' : flightText(entry.value['componentName']),
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                    Text('Due ${lifespanDate(entry.value['dateDue'])}',
                      style: const TextStyle(fontSize: 11, color: Colors.grey)),
                  ])),
                  statusChip(partStatus(entry.value)),
                ]),
                const SizedBox(height: 10),
                Row(children: [
                  for (final metric in [('Days', entry.value['daysRemaining']),
                    ('Time/Cyc', entry.value['timeRemaining']), ('H/D', entry.value['hd'])])
                    Expanded(child: Container(margin: const EdgeInsets.only(right: 6),
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(8)),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(metric.$1.toUpperCase(), style: const TextStyle(fontSize: 10, color: Colors.grey)),
                        Text(metric.$2 == null || '${metric.$2}'.isEmpty ? 'N/A' : '${metric.$2}',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                      ]))),
                ]),
              ]))),
            if (visible.length > pageSize) Row(children: [
              Expanded(child: FilledButton(onPressed: page > 0
                ? () => setState(() => componentPage = page - 1) : null,
                child: const Text('Previous'))),
              Padding(padding: const EdgeInsets.all(10), child: Text('${page + 1}/$pages')),
              Expanded(child: FilledButton(onPressed: page + 1 < pages
                ? () => setState(() => componentPage = page + 1) : null,
                child: const Text('Next'))),
            ]),
          ],
          if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
        ])),
      if (preview != null) Positioned.fill(child: ColoredBox(color: const Color(0x73000000),
        child: Center(child: previewDialog()))),
    ]);
  }
}
