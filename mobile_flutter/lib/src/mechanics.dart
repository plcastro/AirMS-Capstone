import 'dart:io';
import 'package:flutter/material.dart';
import 'auth.dart';
import 'flight_logs.dart';
import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';

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
    final role = flightText(widget.session.user?['jobTitle']).toLowerCase();
    final manager = role == 'maintenance manager' || role == 'admin staff';
    if (!manager) return CertificatePage(session: widget.session, personnelId: flightText(widget.session.user?['_id'] ?? widget.session.user?['id']));
    final visible = people.where((person) {
      final id = flightText(person['_id']);
      final count = tasks.where((task) => flightText(task['assignedTo']) == id &&
        !{'completed', 'turned in', 'approved'}.contains(flightText(task['status']).toLowerCase())).length;
      return '${person['firstName']} ${person['lastName']} ${person['jobTitle']} '
        '${person['isOnline'] == true ? 'online' : 'offline'} ${count >= 3 ? 'busy' : 'available'}'
          .toLowerCase().contains(search.toLowerCase());
    }).toList();
    return RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.all(12), children: [
      TextField(decoration: const InputDecoration(prefixIcon: Icon(Icons.search), labelText: 'Search mechanics', border: OutlineInputBorder()), onChanged: (value) => setState(() => search = value)),
      Padding(padding: const EdgeInsets.all(10), child: Text('Total mechanics: ${visible.length}')),
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
    final visibleTasks = widget.tasks.where((task) {
      final complete = {'completed', 'turned in', 'approved'}
          .contains(flightText(task['status']).toLowerCase());
      return tab == 'Completed' ? complete : !complete;
    }).toList();
    return Scaffold(appBar: AppBar(title: Text('${person['firstName'] ?? ''} ${person['lastName'] ?? ''}')),
    body: ListView(padding: const EdgeInsets.all(12), children: [
      Text('${person['jobTitle'] ?? ''} · ${person['platform'] ?? ''}'),
      Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Wrap(spacing: 8, children: [
        for (final value in const ['Ongoing', 'Completed', 'Certificates'])
          ChoiceChip(label: Text(value), selected: tab == value,
            onSelected: (_) => setState(() => tab = value)),
      ])),
      if (tab != 'Certificates') ...[
        ...visibleTasks.map((task) => Card(child: ListTile(
          title: Text(flightText(task['title'] ?? task['description'] ?? task['taskName'])),
          subtitle: Text('${task['status'] ?? ''} · ${task['endDateTime'] ?? task['deadline'] ?? ''}')))),
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
  Map<String, dynamic> qualifications = {};
  String status = 'all', error = '';
  bool loading = true;
  int page = 1, total = 0;
  bool uploading = false;
  final reassessed = <String>{};
  @override void initState() { super.initState(); load(); }
  Future<void> load() async {
    if (widget.personnelId.isEmpty) return;
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
    setState(() { uploading = true; error = ''; });
    try {
      for (final file in files) {
        final extension = file.name.split('.').last.toLowerCase();
        final mime = extension == 'pdf' ? 'application/pdf' : extension == 'png' ? 'image/png' : 'image/jpeg';
        final bytes = await file.readAsBytes();
        if (bytes.length > 4 * 1024 * 1024) throw const ApiException('Certificate exceeds the 4 MiB limit.');
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
        final record = flightMap(payload['data']);
        if (record['id'] != null && record['revision'] != null) {
          await widget.session.request('/api/certificates/${record['id']}/analyze', method: 'POST', body: {'expectedRevision': record['revision']}, extraHeaders: {'x-action-confirmed': 'true'});
        }
      }
      await load();
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => uploading = false); }
  }
  @override Widget build(BuildContext context) => RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.all(8), children: [
    FilledButton.icon(onPressed: uploading || widget.personnelId.isEmpty ? null : upload, icon: const Icon(Icons.upload_file), label: Text(uploading ? 'Uploading…' : 'Upload certificate')),
    SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: ['all', 'PENDING_REVIEW', 'VERIFIED'].map((value) => Padding(padding: const EdgeInsets.only(right: 6), child: ChoiceChip(label: Text(value), selected: status == value, onSelected: (_) { setState(() { status = value; page = 1; }); load(); }))).toList())),
    if (loading) const Center(child: CircularProgressIndicator()),
    if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
    if (qualifications['results'] is List) ...((qualifications['results'] as List).map((value) { final result = flightMap(value); return Card(child: ListTile(title: Text(flightText(result['aircraft'])), subtitle: Text(result['qualified'] == true ? 'Approved for tasks' : 'No accepted qualifying certificate'))); })),
    ...records.map((record) { final data = flightMap(record['normalizedData']); return Card(child: ListTile(title: Text(flightText(data['certificateType']).isEmpty ? 'Certificate' : flightText(data['certificateType'])), subtitle: Text('${record['status'] ?? ''}\n${data['holderName'] ?? 'Not read yet'}'), isThreeLine: true, trailing: const Icon(Icons.chevron_right), onTap: () async { await Navigator.push(context, MaterialPageRoute(builder: (_) => _CertificateDetail(session: widget.session, id: flightText(record['id'] ?? record['_id']), person: widget.personnelId))); load(); })); }),
    if (!loading && records.isEmpty) const Text('No certificates match this filter.'),
    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [TextButton(onPressed: page <= 1 ? null : () { page--; load(); }, child: const Text('Previous')), Text('Page $page'), TextButton(onPressed: page * 25 >= total ? null : () { page++; load(); }, child: const Text('Next'))]),
  ]));
}
class _CertificateDetail extends StatefulWidget {
  const _CertificateDetail({required this.session, required this.id, required this.person});
  final AirmsSession session;
  final String id, person;
  @override State<_CertificateDetail> createState() => _CertificateDetailState();
}
class _CertificateDetailState extends State<_CertificateDetail> {
  Map<String, dynamic> record = {}, preview = {};
  List<Map<String, dynamic>> history = [];
  static const fields = <(String, String, bool)>[
    ('holderName', 'Certificate holder', false), ('certificateType', 'Certificate type', false),
    ('certificateNumber', 'Certificate number', false), ('issuingAuthority', 'Issuing authority', false),
    ('issueDate', 'Issue date (YYYY-MM-DD)', false), ('expiryDate', 'Expiry date (YYYY-MM-DD)', false),
    ('aircraftRatings', 'Aircraft ratings, one per line', true), ('qualifications', 'Qualifications, one per line', true),
    ('taskAuthorizations', 'Authorizations, one per line', true), ('limitations', 'Limitations, one per line', true),
  ];
  final editors = <String, TextEditingController>{for (final field in fields) field.$1: TextEditingController()};
  final note = TextEditingController();
  bool loading = true, busy = false, sourceReviewed = false;
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
        doesNotExpire = data['doesNotExpire'] == true;
        note.text = flightText(next['reviewNote']); historyPage = 1; hasMoreHistory = history.length == 25;
        error = '';
      }); }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => loading = false); }
  }
  Future<void> action(String operation, {String method = 'POST', Map<String, dynamic> body = const {}}) async {
    setState(() { busy = true; error = ''; });
    try {
      final result = await widget.session.request('/api/certificates/${widget.id}/$operation', method: method,
        body: {'expectedRevision': record['revision'], ...body}, extraHeaders: {'x-action-confirmed': 'true'});
      if (operation == 'preview') {
        if (mounted) setState(() => preview = flightMap(result['data']));
      } else { await load(); }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Map<String, dynamic> corrections() => {
    for (final field in fields) field.$1: field.$3
      ? editors[field.$1]!.text.split('\n').map((item) => item.trim()).where((item) => item.isNotEmpty).toList()
      : (editors[field.$1]!.text.trim().isEmpty ? null : editors[field.$1]!.text.trim()),
    'doesNotExpire': doesNotExpire,
  };
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
    final role = flightText(widget.session.user?['jobTitle']).toLowerCase();
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
          FilledButton(onPressed: busy ? null : () => action('review', method: 'PATCH', body: {'corrections': corrections(), 'reviewNote': note.text.trim()}), child: const Text('Save details')),
          OutlinedButton(onPressed: busy ? null : () => action('preview', body: {'corrections': corrections()}), child: const Text('Check qualifications')),
          if (preview['errors'] is List) ...((preview['errors'] as List).map((item) => Text('$item', style: const TextStyle(color: Colors.red)))),
          if (reviewer) ...[
            CheckboxListTile(value: sourceReviewed, title: const Text('I checked these details against the original certificate'), onChanged: (value) => setState(() => sourceReviewed = value == true)),
            FilledButton(onPressed: busy || !sourceReviewed ? null : () => action('confirm', body: {'confirmedPersonnelId': widget.person, 'sourceReviewed': true, 'reviewNote': note.text.trim()}), child: const Text('Confirm certificate')),
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
