import 'dart:io';
import 'package:flutter/material.dart';
import 'auth.dart';
import 'flight_logs.dart';
import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import 'access.dart';
import 'date_time.dart';

String certificateAircraftLabel(Object? value) => switch (flightText(value)) {
  'AS350B3' => 'AS350B3 / AS350B3e',
  'B412EP' => 'Bell 412 EP',
  final label => label,
};
String certificateLabel(Object? value) {
  final label = flightText(value).replaceAll('_', ' ').toLowerCase();
  return label.isEmpty ? '' : '${label[0].toUpperCase()}${label.substring(1)}';
}
String certificateStatusLabel(Map<String, dynamic> record) => switch (flightText(record['status'])) {
  'VERIFIED' => record['verificationMethod'] == 'AUTOMATIC' ? 'Accepted automatically' : 'Accepted',
  'PENDING_REVIEW' => 'Needs attention',
  final status => certificateLabel(status),
};
bool certificateTaskComplete(Map<String, dynamic> task) =>
  {'completed', 'turned in', 'approved'}.contains(flightText(task['status']).toLowerCase());

class MechanicsPage extends StatefulWidget {
  const MechanicsPage({super.key, required this.session});
  final AirmsSession session;
  @override State<MechanicsPage> createState() => _MechanicsPageState();
}
class _MechanicsPageState extends State<MechanicsPage> {
  List<Map<String, dynamic>> people = [], tasks = [];
  String search = '', error = '';
  bool loading = true;
  @override void initState() { super.initState(); load(); }
  Future<void> load() async {
    setState(() => loading = true);
    try {
      final responses = await Future.wait([widget.session.request('/api/user/assignable-users'), widget.session.request('/api/tasks/getAll')]);
      if (mounted) { setState(() {
        people = (responses[0]['data'] as List? ?? []).map(flightMap).where((person) =>
          flightText(person['status']).toLowerCase() == 'active' &&
          flightText(person['jobTitle']).toLowerCase() == 'mechanic').toList();
        tasks = (responses[1]['data'] as List? ?? []).map(flightMap).toList(); error = '';
      }); }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => loading = false); }
  }
  @override Widget build(BuildContext context) {
    final role = resolveUserRole(widget.session.user);
    final manager = role == 'maintenance manager' || role == 'admin staff';
    if (!manager) return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(padding: const EdgeInsets.all(16), child: Text('${widget.session.user?['firstName'] ?? ''} ${widget.session.user?['lastName'] ?? ''}'.trim().isEmpty
        ? 'My mechanic profile' : '${widget.session.user?['firstName'] ?? ''} ${widget.session.user?['lastName'] ?? ''}'.trim(),
        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
      Expanded(child: CertificatePage(session: widget.session, personnelId: flightText(widget.session.user?['id'] ?? widget.session.user?['_id']))),
    ]);
    final visible = people.where((person) {
      final id = flightText(person['_id']);
      final count = tasks.where((task) => flightText(task['assignedTo']) == id &&
        !{'completed', 'turned in', 'approved'}.contains(flightText(task['status']).toLowerCase())).length;
      return '${person['firstName']} ${person['lastName']} ${person['jobTitle']} '
        '${person['isOnline'] == true ? 'online' : 'offline'} ${count >= 3 ? 'busy' : 'available'}'
          .toLowerCase().contains(search.toLowerCase());
    }).toList();
    return RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.all(12), children: [
      TextField(decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search by mechanic', border: OutlineInputBorder()), onChanged: (value) => setState(() => search = value)),
      Padding(padding: const EdgeInsets.all(10), child: Align(alignment: Alignment.centerRight, child: Text('Total Mechanics (${visible.length})', style: const TextStyle(fontSize: 12, color: Color(0xff5a5a5a))))),
      if (loading) const Center(child: CircularProgressIndicator()),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      ...visible.map((person) {
        final id = flightText(person['_id']);
        final assigned = tasks.where((task) => flightText(task['assignedTo']) == id).toList();
        final ongoing = assigned.where((task) => !['completed', 'turned in', 'approved'].contains(flightText(task['status']).toLowerCase())).length;
        final name = '${person['firstName'] ?? ''} ${person['lastName'] ?? ''}'.trim();
        final displayStatus = person['isOnline'] != true ? 'Offline' : ongoing >= 3 ? 'Busy' : 'Available';
        return Card(child: ListTile(leading: CircleAvatar(child: Text(name.isEmpty ? 'M' : name[0])), title: Text(name),
          subtitle: Text('$displayStatus · $ongoing ongoing tasks'), trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => _MechanicDetail(session: widget.session, person: person, tasks: assigned)))));
      }),
      if (!loading && visible.isEmpty) const Center(child: Text('No mechanics found')),
    ]));
  }
}
class _MechanicDetail extends StatefulWidget {
  const _MechanicDetail({required this.session, required this.person, required this.tasks});
  final AirmsSession session;
  final Map<String, dynamic> person;
  final List<Map<String, dynamic>> tasks;
  @override State<_MechanicDetail> createState() => _MechanicDetailState();
}
class _MechanicDetailState extends State<_MechanicDetail> {
  String tab = 'Ongoing';
  @override Widget build(BuildContext context) {
    final person = widget.person;
    final completedTasks = widget.tasks.where((task) => {'completed', 'turned in', 'approved'}
      .contains(flightText(task['status']).toLowerCase())).toList();
    final ongoingTasks = widget.tasks.where((task) => !completedTasks.contains(task)).toList();
    final platform = flightText(person['platform']).toUpperCase();
    final activePlatform = platform == 'WEB' ? 'Web' : platform == 'MOBILE' ? 'Mobile' : 'Unknown';
    final visibleTasks = widget.tasks.where((task) {
      final complete = {'completed', 'turned in', 'approved'}
          .contains(flightText(task['status']).toLowerCase());
      return tab == 'Completed' ? complete : !complete;
    }).toList();
    return Scaffold(appBar: AppBar(title: Text('${person['firstName'] ?? ''} ${person['lastName'] ?? ''}')),
    body: ListView(padding: const EdgeInsets.all(12), children: [
      Text('${person['jobTitle'] ?? ''} · Active platform: $activePlatform'),
      Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Wrap(spacing: 8, children: [
        for (final value in const ['Ongoing', 'Completed', 'Certificates'])
          ChoiceChip(label: Text(value == 'Certificates' ? 'Certificates & Qualifications'
            : '$value Tasks (${value == 'Completed' ? completedTasks.length : ongoingTasks.length})'), selected: tab == value,
            onSelected: (_) => setState(() => tab = value)),
      ])),
      if (tab != 'Certificates') ...[
        ...visibleTasks.map((task) {
          final due = DateTime.tryParse(flightText(task['endDateTime'] ?? task['dueDate']));
          final completed = DateTime.tryParse(flightText(task['completedAt']));
          final late = due != null && (tab == 'Completed' ? completed != null && completed.isAfter(due)
            : DateTime.now().isAfter(due));
          final priority = flightText(task['priority']);
          final color = priority == 'Overdue' ? Colors.red : priority == 'Due Soon'
            ? Colors.orange : priority == 'Normal' ? Colors.blue : Colors.grey;
          return Card(child: ListTile(
            title: Text('${task['title'] ?? task['taskName'] ?? ''} - ${task['maintenanceType'] ?? 'Corrective Maintenance'}'),
            subtitle: Text('Aircraft: ${task['aircraft'] ?? ''}\nDue: ${formatAirmsDateTime(task['endDateTime'] ?? task['dueDate'], numeric: true)}'
              '${late ? '\n${tab == 'Completed' ? 'Submitted late' : 'Past due'}' : ''}'),
            isThreeLine: true, trailing: Chip(label: Text(priority.isEmpty ? 'Normal' : priority),
              backgroundColor: color.withValues(alpha: .15))));
        }),
        if (visibleTasks.isEmpty) Text('No ${tab.toLowerCase()} tasks assigned to this mechanic'),
      ],
      if (tab == 'Certificates') ...[
      const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text('Certificates', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold))),
      SizedBox(height: 500, child: CertificatePage(session: widget.session, personnelId: flightText(person['_id']))),
      ],
    ]));
  }
}
class CertificatePage extends StatefulWidget {
  const CertificatePage({super.key, required this.session, required this.personnelId});
  final AirmsSession session;
  final String personnelId;
  @override State<CertificatePage> createState() => _CertificatePageState();
}
class _CertificatePageState extends State<CertificatePage> {
  List<Map<String, dynamic>> records = [];
  List<Map<String, dynamic>> uploadResults = [];
  Map<String, dynamic> qualifications = {};
  String status = 'all', error = '';
  bool loading = true;
  int page = 1, total = 0;
  bool uploading = false;
  String uploadProgress = '';
  final reassessed = <String>{};
  @override void initState() { super.initState(); load(); }
  Future<void> load() async {
    if (widget.personnelId.isEmpty) { if (mounted) setState(() => loading = false); return; }
    setState(() => loading = true);
    try {
      var results = await Future.wait([
        widget.session.request('/api/certificates?personnelId=${Uri.encodeComponent(widget.personnelId)}&page=$page&status=$status'),
        widget.session.request('/api/certificates/personnel/${Uri.encodeComponent(widget.personnelId)}/qualifications'),
      ]);
      final listed = (results[0]['data'] as List? ?? []).map(flightMap).toList();
      var rechecked = false;
      for (final record in listed.where((item) => item['needsReassessment'] == true)) {
        final id = flightText(record['id'] ?? record['_id']);
        final key = '$id:${record['revision']}';
        if (id.isEmpty || !reassessed.add(key)) continue;
        try {
          await widget.session.request('/api/certificates/$id/analyze', method: 'POST',
            body: {'expectedRevision': record['revision']}, extraHeaders: {'x-action-confirmed': 'true'});
          rechecked = true;
        } catch (e) { if (mounted) setState(() => error = 'Some saved certificates could not be rechecked: $e'); }
      }
      if (rechecked) {
        results = await Future.wait([
          widget.session.request('/api/certificates?personnelId=${Uri.encodeComponent(widget.personnelId)}&page=$page&status=$status'),
          widget.session.request('/api/certificates/personnel/${Uri.encodeComponent(widget.personnelId)}/qualifications'),
        ]);
      }
      if (mounted) { setState(() {
        records = (results[0]['data'] as List? ?? []).map(flightMap).toList();
        total = (results[0]['pagination'] as Map?)?['total'] as int? ?? 0;
        qualifications = flightMap(results[1]['data']); error = '';
      }); }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => loading = false); }
  }
  Future<void> upload() async {
    final files = await FilePicker.pickFiles(type: FileType.custom, allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png']);
    if (files.isEmpty) return;
    setState(() { uploading = true; error = ''; uploadResults = []; });
    try {
      for (var index = 0; index < files.length; index++) {
        final file = files[index];
        if (mounted) setState(() => uploadProgress = 'Reading ${index + 1} of ${files.length}: ${file.name}');
        try {
        final extension = file.name.split('.').last.toLowerCase();
        if (!const {'pdf', 'jpg', 'jpeg', 'png'}.contains(extension)) throw const ApiException('Choose a PDF, JPG or PNG certificate.');
        final mime = extension == 'pdf' ? 'application/pdf' : extension == 'png' ? 'image/png' : 'image/jpeg';
        final bytes = await file.readAsBytes();
        if (bytes.length > 4 * 1024 * 1024) throw const ApiException('This file exceeds the 4 MiB limit.');
        final request = http.MultipartRequest('POST', Uri.parse('$apiBase/api/certificates/personnel/${Uri.encodeComponent(widget.personnelId)}'));
        request.headers.addAll({...widget.session.headers(), 'x-action-confirmed': 'true'}..remove('Content-Type'));
        request.files.add(http.MultipartFile.fromBytes('file', bytes, filename: file.name, contentType: MediaType.parse(mime)));
        var response = await http.Response.fromStream(await request.send());
        if (response.statusCode == 401 && await widget.session.refresh() != null) {
          final retry = http.MultipartRequest('POST', request.url);
          retry.headers.addAll({...widget.session.headers(), 'x-action-confirmed': 'true'}..remove('Content-Type'));
          retry.files.add(http.MultipartFile.fromBytes('file', bytes, filename: file.name, contentType: MediaType.parse(mime)));
          response = await http.Response.fromStream(await retry.send());
        }
        final payload = decodeResponse(response);
        if (response.statusCode >= 400) throw ApiException('${payload['message'] ?? 'Certificate upload failed'}');
        var record = flightMap(payload['data']);
        final result = {'name': file.name, 'record': record, 'status': 'uploaded'};
        if (mounted) setState(() => uploadResults.add(result));
        if (record['id'] != null && record['revision'] != null) {
          try {
            if (mounted) setState(() => uploadProgress = 'Reading ${index + 1} of ${files.length}: ${file.name}');
            final analyzed = await widget.session.request('/api/certificates/${record['id']}/analyze', method: 'POST', body: {'expectedRevision': record['revision']}, extraHeaders: {'x-action-confirmed': 'true'});
            final updated = flightMap(flightMap(analyzed['data'])['certificate']);
            if (mounted && updated.isNotEmpty) setState(() => result['record'] = updated);
          } catch (e) {
            if (mounted) setState(() => result['message'] = 'File saved. $e Open it to retry or check the details.');
            if ('$e'.contains('401') || '$e'.contains('403') || '$e'.contains('429')) {
              if (mounted) setState(() => uploadResults.addAll(files.skip(index + 1).map((remaining) =>
                {'name': remaining.name, 'status': 'skipped', 'message': 'Not uploaded. Please retry later.'})));
              break;
            }
          }
        }
        } catch (e) {
          if (mounted) setState(() => uploadResults.add({'name': file.name, 'status': 'failed', 'message': '$e'}));
          if ('$e'.contains('401') || '$e'.contains('403') || '$e'.contains('429')) {
            if (mounted) setState(() => uploadResults.addAll(files.skip(index + 1).map((remaining) =>
              {'name': remaining.name, 'status': 'skipped', 'message': 'Not uploaded: $e'})));
            break;
          }
        }
      }
      await load();
      final successful = uploadResults.where((result) => result['status'] == 'uploaded').toList();
      if (files.length == 1 && successful.length == 1 && mounted) {
        final record = flightMap(successful.first['record']);
        if (record['status'] != 'VERIFIED') {
          await Navigator.push(context, MaterialPageRoute(builder: (_) => _CertificateDetail(session: widget.session,
            id: flightText(record['id'] ?? record['_id']), person: widget.personnelId)));
          await load();
        }
      }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() { uploading = false; uploadProgress = ''; }); }
  }
  @override Widget build(BuildContext context) => RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.all(8), children: [
    const Text('Certificates & aircraft approval', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
    const Text('Upload a certificate. We read the holder, type and qualifications, then approve tasks for a matching aircraft. We ask for help if the reading is unclear.'),
    FilledButton.icon(onPressed: uploading || widget.personnelId.isEmpty ? null : upload, icon: const Icon(Icons.upload_file), label: Text(uploading ? 'Uploading…' : 'Upload certificate')),
    const Text('PDF, JPG or PNG · up to 4 MiB · PDF up to 20 pages'),
    if (uploadProgress.isNotEmpty) Text(uploadProgress),
    OutlinedButton(onPressed: uploading ? null : load, child: const Text('Refresh')),
    SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: ['all', 'PENDING_REVIEW', 'VERIFIED'].map((value) => Padding(padding: const EdgeInsets.only(right: 6), child: ChoiceChip(label: Text(value == 'all' ? 'All' : value == 'PENDING_REVIEW' ? 'Needs attention' : 'Accepted'), selected: status == value, onSelected: (_) { setState(() { status = value; page = 1; }); load(); }))).toList())),
    if (uploadResults.isNotEmpty) Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Upload results', style: TextStyle(fontWeight: FontWeight.bold)),
      for (final result in uploadResults) ListTile(title: Text('${result['name']}'), subtitle: Text(result['status'] == 'uploaded'
        ? flightMap(result['record'])['status'] == 'VERIFIED' ? 'Accepted automatically' : 'Needs attention'
        : '${result['message'] ?? 'Upload failed'}'), trailing: result['status'] == 'uploaded' && flightMap(result['record'])['status'] != 'VERIFIED'
          ? TextButton(onPressed: () async { final record = flightMap(result['record']); await Navigator.push(context, MaterialPageRoute(builder: (_) =>
              _CertificateDetail(session: widget.session, id: flightText(record['id'] ?? record['_id']), person: widget.personnelId))); load(); },
            child: const Text('Check details')) : null),
    ]))),
    if (loading) const Center(child: CircularProgressIndicator()),
    if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
    if (qualifications['results'] is List) ...[
      const Text('Aircraft task approval', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
      ...((qualifications['results'] as List).map((value) { final result = flightMap(value); return Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(certificateAircraftLabel(result['aircraft']), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
        Text(result['qualified'] == true ? 'Approved for all tasks' : 'Not approved', style: const TextStyle(fontWeight: FontWeight.bold)),
        Text(result['qualified'] == true ? 'A certificate linked to this mechanic matches this aircraft.' : 'No accepted certificate currently qualifies this mechanic for this aircraft.'),
        for (final sourceValue in result['approvalEvidence'] as List? ?? []) Builder(builder: (context) { final source = flightMap(sourceValue); final evidence = source['evidence'] as List? ?? [];
          return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(flightText(source['certificateType']).isEmpty ? 'Certificate' : flightText(source['certificateType']), style: const TextStyle(fontWeight: FontWeight.bold)),
            if (evidence.isNotEmpty) Text('Matched “${flightMap(evidence.first)['detectedText']}” in “${flightMap(evidence.first)['qualification']}”.'),
            TextButton(onPressed: () async { await Navigator.push(context, MaterialPageRoute(builder: (_) => _CertificateDetail(session: widget.session,
              id: flightText(source['certificateId']), person: widget.personnelId, results: (qualifications['results'] as List).map(flightMap).toList()))); load(); }, child: const Text('Why this mechanic was approved')),
          ]);
        }),
        if (result['validThrough'] != null) Text('Valid through ${result['validThrough']}'),
      ]))); })),
    ],
    ...records.map((record) { final data = flightMap(record['normalizedData']); return Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(flightText(data['certificateType']).isEmpty ? 'Certificate' : flightText(data['certificateType']), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
      Text(certificateStatusLabel(record)), const SizedBox(height: 8), const Text('Certificate holder', style: TextStyle(fontWeight: FontWeight.bold)),
      Text(flightText(data['holderName']).isEmpty ? 'Not read yet' : flightText(data['holderName'])),
      const SizedBox(height: 8), const Text('Qualifications', style: TextStyle(fontWeight: FontWeight.bold)),
      Text((data['qualifications'] as List? ?? []).isEmpty ? 'Not read yet' : (data['qualifications'] as List).join('\n')),
      const SizedBox(height: 8), const Text('Detected aircraft', style: TextStyle(fontWeight: FontWeight.bold)),
      Text((data['aircraftRatings'] as List? ?? []).isEmpty ? 'No match yet' : (data['aircraftRatings'] as List).map(certificateAircraftLabel).join(', ')),
      TextButton(onPressed: () async { await Navigator.push(context, MaterialPageRoute(builder: (_) => _CertificateDetail(session: widget.session,
        id: flightText(record['id'] ?? record['_id']), person: widget.personnelId, results: (qualifications['results'] as List? ?? []).map(flightMap).toList()))); load(); },
        child: Text(record['status'] == 'PENDING_REVIEW' ? 'Check details' : 'View certificate')),
    ]))); }),
    if (!loading && records.isEmpty) const Text('No certificates match this filter.'),
    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [TextButton(onPressed: page <= 1 ? null : () { page--; load(); }, child: const Text('Previous')), Text('Page $page'), TextButton(onPressed: page * 25 >= total ? null : () { page++; load(); }, child: const Text('Next'))]),
  ]));
}
class _CertificateDetail extends StatefulWidget {
  const _CertificateDetail({required this.session, required this.id, required this.person, this.results = const []});
  final AirmsSession session;
  final String id, person;
  final List<Map<String, dynamic>> results;
  @override State<_CertificateDetail> createState() => _CertificateDetailState();
}
class _CertificateDetailState extends State<_CertificateDetail> {
  Map<String, dynamic> record = {}, preview = {};
  List<Map<String, dynamic>> history = [];
  static const fields = <(String, String, bool)>[
    ('holderName', 'Certificate holder', false), ('certificateType', 'Certificate type', false),
    ('qualifications', 'Qualifications — one per line', true),
  ];
  final editors = <String, TextEditingController>{for (final field in fields) field.$1: TextEditingController()};
  final note = TextEditingController();
  bool loading = true, busy = false, sourceReviewed = false, showHistory = false;
  bool doesNotExpire = false, loadingHistory = false, hasMoreHistory = false;
  int historyPage = 1;
  String error = '';
  @override void initState() { super.initState(); load(); }
  @override void dispose() { for (final editor in editors.values) { editor.dispose(); } note.dispose(); super.dispose(); }
  Future<void> load() async {
    setState(() => loading = true);
    try {
      final results = await Future.wait([widget.session.request('/api/certificates/${widget.id}'), widget.session.request('/api/certificates/${widget.id}/history')]);
      final next = flightMap(results[0]['data']);
      final data = flightMap(next['normalizedData']);
      if (mounted) { setState(() {
        record = next; history = (results[1]['data'] as List? ?? []).map(flightMap).toList();
        for (final field in fields) {
          editors[field.$1]!.text = field.$3 ? (data[field.$1] as List? ?? []).join('\n') : flightText(data[field.$1]);
        }
        note.text = flightText(next['reviewNote']); historyPage = 1; hasMoreHistory = history.length == 25;
        error = '';
      }); }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => loading = false); }
  }
  Future<void> action(String operation, {String method = 'POST', Map<String, dynamic> body = const {}}) async {
    if (operation == 'reject' || operation == 'revoke') {
      final confirmed = await showDialog<bool>(context: context, builder: (dialogContext) => AlertDialog(
        title: const Text('Withdraw this certificate?'),
        content: const Text('This certificate will no longer grant task access. Its original and history remain saved.'),
        actions: [TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Confirm'))],
      ));
      if (confirmed != true || !mounted) return;
    }
    setState(() { busy = true; error = ''; });
    try {
      final result = await widget.session.request('/api/certificates/${widget.id}/$operation', method: method,
        body: {'expectedRevision': record['revision'], ...body}, extraHeaders: {'x-action-confirmed': 'true'});
      if (operation == 'preview') {
        if (mounted) setState(() => preview = flightMap(result['data']));
      } else { await load(); }
    } catch (e) { if (mounted) setState(() => error = '$e${'$e'.contains('409') ? '\nClose this review and open it again to see the latest certificate.' : ''}'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Map<String, dynamic> corrections() => {
    for (final field in fields) field.$1: field.$3
      ? editors[field.$1]!.text.split('\n').map((item) => item.trim()).where((item) => item.isNotEmpty).toList()
      : (editors[field.$1]!.text.trim().isEmpty ? null : editors[field.$1]!.text.trim()),
  };
  Future<void> saveSummary(bool reviewer) async {
    setState(() { busy = true; error = ''; });
    try {
      final saved = await widget.session.request('/api/certificates/${widget.id}/review', method: 'PATCH',
        body: {'expectedRevision': record['revision'], 'corrections': corrections(),
          'reviewNote': 'Checked the certificate holder, type and qualifications against the original.'},
        extraHeaders: {'x-action-confirmed': 'true'});
      final payload = flightMap(saved['data']);
      final updated = flightMap(payload['certificate']);
      final checked = flightMap(payload['preview']);
      if (mounted) setState(() { record = updated; preview = checked; });
      if (reviewer && (checked['errors'] as List? ?? []).isEmpty) {
        final confirmation = await widget.session.request('/api/certificates/${widget.id}/confirm', method: 'POST',
          body: {'expectedRevision': updated['revision'], 'confirmedPersonnelId': widget.person,
            'sourceReviewed': true, 'reviewNote': 'Confirmed the certificate holder, type and qualifications against the original.'},
          extraHeaders: {'x-action-confirmed': 'true'});
        if (mounted) setState(() { record = flightMap(confirmation['data']); preview = {}; });
      }
      if (mounted) await load();
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> moreHistory() async {
    if (loadingHistory || !hasMoreHistory) return;
    setState(() => loadingHistory = true);
    try {
      final response = await widget.session.request('/api/certificates/${widget.id}/history?page=${historyPage + 1}');
      final older = (response['data'] as List? ?? []).map(flightMap).toList();
      if (mounted) setState(() { history.addAll(older); historyPage++; hasMoreHistory = older.length == 25; });
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => loadingHistory = false); }
  }
  Future<void> openOriginal() async {
    setState(() { busy = true; error = ''; });
    try {
      final uri = Uri.parse('$apiBase/api/certificates/${widget.id}/file');
      var response = await http.get(uri, headers: widget.session.headers());
      if (response.statusCode == 401 && await widget.session.refresh() != null) response = await http.get(uri, headers: widget.session.headers());
      if (response.statusCode >= 400) throw ApiException('${decodeResponse(response)['message'] ?? 'Certificate file unavailable'}');
      final rawName = flightText(flightMap(record['file'])['name']);
      final safeName = rawName.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
      final extension = safeName.toLowerCase().endsWith('.pdf') ? '.pdf' : safeName.toLowerCase().endsWith('.png') ? '.png' : '.jpg';
      final cache = await getTemporaryDirectory();
      final file = File('${cache.path}${Platform.pathSeparator}certificate_${widget.id}$extension');
      await file.writeAsBytes(response.bodyBytes, flush: true);
      final opened = await OpenFile.open(file.path);
      if (opened.type != ResultType.done) throw ApiException(opened.message);
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) {
    final role = resolveUserRole(widget.session.user);
    final reviewer = role == 'maintenance manager' || role == 'admin staff';
    final pending = record['status'] == 'PENDING_REVIEW';
    final verified = record['status'] == 'VERIFIED';
    final data = flightMap(record['normalizedData']);
    return Scaffold(appBar: AppBar(title: const Text('Certificate details'), actions: [IconButton(onPressed: load, icon: const Icon(Icons.refresh))]),
      body: loading ? const Center(child: CircularProgressIndicator()) : ListView(padding: const EdgeInsets.all(12), children: [
        if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
        Text(flightText(record['status']), style: Theme.of(context).textTheme.titleMedium),
        OutlinedButton.icon(onPressed: busy ? null : openOriginal, icon: const Icon(Icons.file_open_outlined), label: const Text('View original')),
        Text('Revision ${record['revision'] ?? '—'}'),
        if (pending && record['processingStatus'] != 'ANALYZED') FilledButton(onPressed: busy ? null : () => action('analyze'), child: const Text('Read certificate')),
        if (pending) ...[
          for (final field in fields) TextField(controller: editors[field.$1], maxLines: field.$3 ? 3 : 1,
            decoration: InputDecoration(labelText: field.$2)),
          CheckboxListTile(value: doesNotExpire, title: const Text('Does not expire'),
            onChanged: (value) => setState(() => doesNotExpire = value == true)),
          FilledButton(onPressed: busy || reviewer && !sourceReviewed ? null : () async {
            await action('review', method: 'PATCH', body: {'corrections': corrections(), 'reviewNote': note.text.trim()});
            if (reviewer && error.isEmpty && mounted) {
              await action('confirm', body: {
                'confirmedPersonnelId': widget.person, 'sourceReviewed': true, 'reviewNote': note.text.trim()});
            }
          }, child: Text(reviewer ? 'Confirm details' : 'Save details')),
          OutlinedButton(onPressed: busy ? null : () => action('preview', body: {'corrections': corrections()}), child: const Text('Check qualifications')),
          if (preview['errors'] is List) ...((preview['errors'] as List).map((item) => Text('$item', style: const TextStyle(color: Colors.red)))),
          if (reviewer) ...[
            CheckboxListTile(value: sourceReviewed, title: const Text('I checked these details against the original certificate'), onChanged: (value) => setState(() => sourceReviewed = value == true)),
            const Text('Confirming records that you checked these details against the original certificate.'),
          ],
        ],
        ...data.entries.where((entry) => !fields.any((field) => field.$1 == entry.key)).map((entry) => Card(child: ListTile(title: Text(entry.key), subtitle: Text('${entry.value}')))),
        TextField(controller: note, maxLines: 2, decoration: const InputDecoration(labelText: 'Review note'), onChanged: (_) => setState(() {})),
        if (reviewer && (pending || verified)) OutlinedButton(onPressed: busy || note.text.trim().isEmpty ? null : () => action(verified ? 'revoke' : 'reject', body: {'reviewNote': note.text.trim()}), child: Text(verified ? 'Withdraw approval' : 'Reject certificate')),
        ExpansionTile(title: const Text('History'), children: [
          ...history.map((item) => ListTile(title: Text(flightText(item['action'])), subtitle: Text('${item['createdAt'] ?? ''}\n${flightText(flightMap(item['details'])['reviewNote'])}'))),
          if (hasMoreHistory) TextButton(onPressed: loadingHistory ? null : moreHistory, child: Text(loadingHistory ? 'Loading...' : 'Older history')),
        ]),
      ]));
  }
}
