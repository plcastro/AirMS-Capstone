import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'auth.dart';
import 'flight_signing.dart';

String taskId(Map task) => '${task['_id'] ?? task['id'] ?? ''}';
String taskText(dynamic value) {
  if (value is Map) return '${value['name'] ?? value['title'] ?? value['tailNum'] ?? value['_id'] ?? ''}';
  return '${value ?? ''}';
}

class TasksPage extends StatefulWidget {
  const TasksPage({super.key, required this.session});
  final AirmsSession session;
  @override State<TasksPage> createState() => _TasksPageState();
}
class _TasksPageState extends State<TasksPage> {
  List<Map<String, dynamic>> tasks = [];
  String tab = 'Assigned', query = '', error = '';
  bool loading = true;
  bool get head => {'maintenance manager', 'admin staff'}.contains('${widget.session.user?['jobTitle'] ?? ''}'.toLowerCase());
  String get me => '${widget.session.user?['_id'] ?? widget.session.user?['id'] ?? ''}';
  @override void initState() { super.initState(); load(); }
  Future<void> load() async {
    setState(() => loading = true);
    try {
      final response = await widget.session.request('/api/tasks/getAll');
      final all = (response['data'] as List? ?? []).whereType<Map>().map((task) => Map<String, dynamic>.from(task)).toList();
      if (mounted) {
        setState(() { tasks = head ? all : all.where((task) =>
          taskText(task['assignedTo']) == me).toList(); error = ''; });
      }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => loading = false); }
  }
  bool inTab(Map task) {
    final status = '${task['status'] ?? ''}'.toLowerCase();
    if (head) {
      return switch (tab) {
        'For Review' => ['completed', 'turned in'].contains(status) && task['isApproved'] != true,
        'History' => ['approved', 'deleted'].contains(status) || task['isApproved'] == true,
        _ => !['approved', 'deleted', 'completed', 'turned in'].contains(status),
      };
    }
    return switch (tab) {
      'History' => ['approved', 'completed', 'turned in'].contains(status),
      _ => !['approved', 'completed', 'turned in'].contains(status),
    };
  }
  Future<void> open(Map<String, dynamic> task) async {
    final changed = await Navigator.push<bool>(context, MaterialPageRoute(builder: (_) => TaskDetailPage(
      session: widget.session, task: task, head: head)));
    if (changed == true) load();
  }
  @override Widget build(BuildContext context) {
    final filtered = tasks.where((task) => inTab(task) && '$task'.toLowerCase().contains(query.toLowerCase())).toList();
    return Stack(children: [RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.fromLTRB(16, 12, 16, 90), children: [
      TextField(decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search tasks', border: OutlineInputBorder()),
        onChanged: (value) => setState(() => query = value)),
      const SizedBox(height: 8),
      SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: [for (final label in head
        ? ['Assigned', 'For Review', 'History'] : ['Assigned', 'History'])
        Padding(padding: const EdgeInsets.only(right: 8), child: ChoiceChip(label: Text(label), selected: tab == label,
          onSelected: (_) => setState(() => tab = label)))])),
      const SizedBox(height: 10),
      if (loading) const LinearProgressIndicator(),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      if (!loading && filtered.isEmpty) const Padding(padding: EdgeInsets.all(24), child: Center(child: Text('No tasks found'))),
      for (final task in filtered) Card(child: InkWell(onTap: () => open(task), child: Row(children: [
        Container(width: 5, height: 120, color: const Color(0xff26866f)),
        Expanded(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [Expanded(child: Text(taskText(task['title']).isEmpty ? 'Maintenance Task' : taskText(task['title']),
            style: const TextStyle(fontWeight: FontWeight.bold))),
            Chip(label: Text('${task['status'] ?? 'Pending'}', style: const TextStyle(fontSize: 10)))]),
          Text('Aircraft: ${taskText(task['aircraft'])}'),
          Text('Assigned: ${task['assignedToName'] ?? ''}'),
          Text('Priority: ${task['priority'] ?? ''}'),
          LinearProgressIndicator(value: (task['checklistItems'] as List? ?? []).isEmpty ? 0 :
            (task['checklistState'] as List? ?? []).where((value) => value == true).length /
              (task['checklistItems'] as List).length),
        ]))),
      ]))),
    ])),
      if (head) Positioned(right: 16, bottom: 16, child: FloatingActionButton.extended(onPressed: () async {
        final changed = await Navigator.push<bool>(context, MaterialPageRoute(builder: (_) => TaskFormPage(session: widget.session)));
        if (changed == true) load();
      }, icon: const Icon(Icons.add), label: const Text('Add Task'))),
    ]);
  }
}

class TaskDetailPage extends StatefulWidget {
  const TaskDetailPage({super.key, required this.session, required this.task, required this.head});
  final AirmsSession session;
  final Map<String, dynamic> task;
  final bool head;
  @override State<TaskDetailPage> createState() => _TaskDetailPageState();
}
class _TaskDetailPageState extends State<TaskDetailPage> {
  late Map<String, dynamic> task;
  late List<bool> checks;
  late TextEditingController findings;
  bool busy = false;
  String error = '';
  @override void initState() {
    super.initState(); task = widget.task;
    final items = task['checklistItems'] as List? ?? [];
    final state = task['checklistState'] as List? ?? [];
    checks = List.generate(items.length, (index) => index < state.length && state[index] == true);
    findings = TextEditingController(text: '${task['findings'] ?? ''}');
  }
  @override void dispose() { findings.dispose(); super.dispose(); }
  Future<void> change(Map<String, dynamic> changes, String label) async {
    final confirmed = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: Text(label), content: Text('$label this task?'), actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Confirm')),
      ]));
    if (confirmed != true) return;
    setState(() { busy = true; error = ''; });
    try {
      final updated = await widget.session.request('/api/tasks/${taskId(task)}', method: 'PUT',
        extraHeaders: {'x-action-confirmed': 'true'}, body: {
          ...task, ...changes, 'confirmAction': true, 'confirmBusyMechanic': true,
        });
      if (mounted) setState(() => task = Map<String, dynamic>.from(updated['data'] as Map? ?? {...task, ...changes}));
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$label successful')));
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> remove() async {
    final confirmed = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: const Text('Delete Task'), content: const Text('Delete this task?'), actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
      ]));
    if (confirmed != true) return;
    try {
      await widget.session.request('/api/tasks/${taskId(task)}', method: 'DELETE',
        extraHeaders: {'x-action-confirmed': 'true'});
      if (mounted) Navigator.pop(context, true);
    } catch (e) { if (mounted) setState(() => error = '$e'); }
  }
  Future<void> approve() async {
    final signature = await collectFlightSignature(context, widget.session);
    if (signature == null) return;
    final now = DateTime.now().toUtc().toIso8601String();
    await change({
      'status': 'Approved', 'isApproved': true,
      'approvedBy': '${widget.session.user?['firstName'] ?? ''} ${widget.session.user?['lastName'] ?? ''}',
      'approvedSignature': signature.image, 'reviewedAt': now, 'approvedAt': now,
    }, 'Approve');
  }
  Future<void> returnForRevision() async {
    final comments = TextEditingController();
    final toUncheck = <int>{};
    final items = task['checklistItems'] as List? ?? [];
    final result = await showDialog<(String, Set<int>)>(context: context, builder: (_) => StatefulBuilder(builder: (context, update) => AlertDialog(
      title: const Text('Return task for revision'),
      content: SizedBox(width: 440, child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: comments, maxLines: 3, decoration: const InputDecoration(labelText: 'Return comments')),
        for (var index = 0; index < items.length; index++) if (index < checks.length && checks[index])
          CheckboxListTile(value: toUncheck.contains(index), title: Text(taskText((items[index] as Map?)?['taskName'])),
            subtitle: const Text('Uncheck for mechanic to redo'),
            onChanged: (value) => update(() { if (value == true) { toUncheck.add(index); } else { toUncheck.remove(index); } })),
      ]))),
      actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(context, (comments.text.trim(), {...toUncheck})), child: const Text('Continue'))],
    )));
    comments.dispose();
    if (result == null || !mounted) return;
    final signature = await collectFlightSignature(context, widget.session);
    if (signature == null) return;
    final nextChecks = [...checks];
    for (final index in result.$2) { nextChecks[index] = false; }
    await change({
      'status': 'Returned', 'returnComments': result.$1.isEmpty ? 'Please revise findings' : result.$1,
      'returnedBy': signature.image, 'reviewedAt': DateTime.now().toUtc().toIso8601String(),
      'returnedAt': DateTime.now().toUtc().toIso8601String(), 'isApproved': false,
      'checklistState': nextChecks,
    }, 'Return');
  }
  @override Widget build(BuildContext context) {
    final status = '${task['status'] ?? 'Pending'}';
    final items = task['checklistItems'] as List? ?? [];
    return Scaffold(appBar: AppBar(title: Text(taskText(task['title']))), body: ListView(padding: const EdgeInsets.all(16), children: [
      Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Status: $status'), Text('Aircraft: ${taskText(task['aircraft'])}'),
        Text('Assigned to: ${task['assignedToName'] ?? ''}'),
        Text('Priority: ${task['priority'] ?? ''}'),
        Text('Start: ${task['startDateTime'] ?? ''}'), Text('End: ${task['endDateTime'] ?? ''}'),
        if ('${task['returnComments'] ?? ''}'.isNotEmpty) Text('Return comments: ${task['returnComments']}'),
      ]))),
      const SizedBox(height: 12), const Text('Checklist', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
      for (var index = 0; index < items.length; index++) CheckboxListTile(value: checks[index],
        title: Text(taskText((items[index] as Map?)?['taskName'])),
        onChanged: widget.head ? null : (value) => setState(() => checks[index] = value ?? false)),
      TextField(controller: findings, maxLines: 4, readOnly: widget.head,
        decoration: const InputDecoration(labelText: 'Findings', border: OutlineInputBorder())),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      if (busy) const LinearProgressIndicator(),
      const SizedBox(height: 12),
      if (widget.head) ...[
        if (['completed', 'turned in'].contains(status.toLowerCase()))
          Row(children: [Expanded(child: FilledButton(onPressed: busy ? null : approve, child: const Text('Approve'))),
            const SizedBox(width: 8), Expanded(child: OutlinedButton(onPressed: busy ? null : returnForRevision, child: const Text('Return')))]),
        OutlinedButton(onPressed: busy ? null : () async {
          final changed = await Navigator.push<bool>(context, MaterialPageRoute(builder: (_) => TaskFormPage(session: widget.session, task: task)));
          if (!mounted) return;
          if (changed == true) Navigator.pop(this.context, true);
        }, child: const Text('Edit')),
        TextButton(onPressed: busy ? null : remove, child: const Text('Delete Task')),
      ] else ...[
        if (status.toLowerCase() == 'pending' || status.toLowerCase() == 'returned')
          FilledButton(onPressed: busy ? null : () => change({'status': 'Ongoing',
            'startDateTime': DateTime.now().toUtc().toIso8601String()}, 'Start'), child: const Text('Start Task')),
        if (status.toLowerCase() == 'ongoing' || status.toLowerCase() == 'returned') ...[
          OutlinedButton(onPressed: busy ? null : () => change({'checklistState': checks, 'findings': findings.text}, 'Save Draft'),
            child: const Text('Save Draft')),
          FilledButton(onPressed: busy ? null : () => change({'status': 'Completed', 'checklistState': checks,
            'findings': findings.text, 'completedAt': DateTime.now().toUtc().toIso8601String()}, 'Turn In'),
            child: const Text('Turn In')),
        ],
        if (status.toLowerCase() == 'completed') OutlinedButton(onPressed: busy ? null : () => change({
          'status': 'Ongoing', 'completedAt': null, 'checklistState': checks, 'findings': findings.text,
        }, 'Undo Turn In'), child: const Text('Undo Turn In')),
      ],
    ]));
  }
}

class TaskFormPage extends StatefulWidget {
  const TaskFormPage({super.key, required this.session, this.task, this.inspectionDraft});
  final AirmsSession session;
  final Map<String, dynamic>? task;
  final Map<String, dynamic>? inspectionDraft;
  @override State<TaskFormPage> createState() => _TaskFormPageState();
}
class _TaskFormPageState extends State<TaskFormPage> {
  final title = TextEditingController(), aircraft = TextEditingController();
  final checklist = TextEditingController();
  List<Map> mechanics = [];
  List<String> aircraftOptions = [];
  List<Map<String, dynamic>> inspectionOptions = [];
  List<Map<String, dynamic>> inspectionChecklist = [];
  Map<String, dynamic> timing = {};
  String selectedInspection = 'custom';
  bool loadingInspection = false;
  bool endManuallyAdjusted = false;
  List<Map<String, dynamic>> qualifications = [];
  String qualificationError = '';
  bool checkingQualifications = false;
  int qualificationRequest = 0;
  String? assignee, priority = 'Normal';
  String base = '';
  DateTime start = DateTime.now().add(const Duration(minutes: 5));
  DateTime end = DateTime.now().add(const Duration(days: 1));
  bool busy = false;
  String error = '';
  @override void initState() {
    super.initState();
    final task = widget.task ?? {};
    title.text = '${task['title'] ?? ''}'; aircraft.text = taskText(task['aircraft']);
    start = DateTime.tryParse(taskText(task['startDateTime']))?.toLocal() ?? start;
    end = DateTime.tryParse(taskText(task['endDateTime']))?.toLocal() ?? end;
    endManuallyAdjusted = widget.task != null;
    final startingBase = taskText(task['base'] ?? widget.session.session['base']).toUpperCase();
    base = {'MANILA', 'CEBU', 'CDO'}.contains(startingBase) ? startingBase : '';
    assignee = taskText(task['assignedTo']); priority = '${task['priority'] ?? 'Normal'}';
    checklist.text = (task['checklistItems'] as List? ?? []).map((item) => taskText((item as Map?)?['taskName'])).join('\n');
    inspectionChecklist = (task['checklistItems'] as List? ?? [])
        .whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList();
    if (widget.inspectionDraft != null && widget.task == null) {
      final draft = widget.inspectionDraft!;
      title.text = taskText(draft['inspectionName']);
      aircraft.text = taskText(draft['aircraft']);
      checklist.text = title.text;
      priority = {'Overdue', 'Due Soon'}.contains(taskText(draft['dueStatus'])) ? 'High' : 'Normal';
      final due = DateTime.tryParse(taskText(draft['dueDate']));
      if (due != null && due.isAfter(start)) {
        end = due;
        endManuallyAdjusted = true;
      }
    }
    loadMechanics();
    loadTiming();
    if (widget.task == null) loadInspections();
  }
  @override void dispose() { title.dispose(); aircraft.dispose(); checklist.dispose(); super.dispose(); }
  Future<void> loadMechanics() async {
    try {
      final responses = await Future.wait([
        widget.session.request('/api/user/assignable-users'),
        widget.session.request('/api/parts-monitoring/aircraft-list'),
      ]);
      if (mounted) { setState(() {
        mechanics = (responses[0]['data'] as List? ?? []).whereType<Map>().toList();
        aircraftOptions = (responses[1]['data'] as List? ?? []).map((item) => '$item').toList();
      }); }
      if (aircraft.text.trim().isNotEmpty) { loadQualifications(); }
    } catch (_) {}
  }
  Future<void> loadInspections() async {
    try {
      final response = await widget.session.request('/api/inspections/schedules');
      final seen = <String>{};
      final options = (response['data'] as List? ?? []).map((item) =>
          Map<String, dynamic>.from(item as Map)).where((item) =>
          seen.add(taskText(item['_id']))).toList();
      if (mounted) setState(() => inspectionOptions = options);
      final draft = widget.inspectionDraft;
      if (draft != null && mounted) {
        final name = taskText(draft['inspectionName']).trim().toLowerCase();
        final model = taskText(draft['aircraftModel']).trim().toLowerCase();
        final match = options.where((item) =>
          taskText(item['inspectionName']).trim().toLowerCase() == name &&
          (model.isEmpty || taskText(item['aircraftModel']).trim().toLowerCase() == model)).firstOrNull ??
          options.where((item) => taskText(item['inspectionName']).trim().toLowerCase() == name).firstOrNull ??
          options.where((item) => taskText(item['inspectionName']).trim().toLowerCase() == 'oc inspection').firstOrNull;
        if (match != null) await selectInspection(taskText(match['_id']));
      }
    } catch (e) { if (mounted) setState(() => error = 'Could not load inspection schedules: $e'); }
  }
  Future<void> loadTiming() async {
    try {
      final loaded = Map<String, dynamic>.from(jsonDecode(
        await rootBundle.loadString('assets/inspectionTiming.json')) as Map);
      if (mounted) setState(() { timing = loaded; updateEstimate(); });
    } catch (_) {}
  }
  String normalizeTiming(String value) => value.toLowerCase()
      .replaceAll(RegExp(r'[_-]+'), ' ').replaceAll(RegExp(r'\s+'), ' ').trim();
  double get estimatedHours {
    final lines = checklist.text.split('\n').map((line) => line.trim())
        .where((line) => line.isNotEmpty).toList();
    final exact = timing['exact'] as Map? ?? {};
    final rules = timing['rules'] as List? ?? [];
    var minutes = 10.0;
    for (var index = 0; index < lines.length; index++) {
      final item = index < inspectionChecklist.length ? inspectionChecklist[index] : <String, dynamic>{};
      final key = normalizeTiming(lines[index]);
      final description = normalizeTiming([lines[index], item['component'], item['description'],
        item['documentation'], item['correctiveAction']].map(taskText).join(' '));
      num duration = exact[key] as num? ?? 12;
      if (!exact.containsKey(key)) {
        for (final raw in rules) {
          final rule = Map<String, dynamic>.from(raw as Map);
          final words = rule['keywords'] as List? ?? [];
          if (words.any((word) => description.contains(taskText(word)))) {
            duration = rule['minutes'] as num? ?? 12;
            break;
          }
        }
      }
      minutes += duration.toDouble() + 2;
    }
    return (minutes < 60 ? 60 : minutes) / 60;
  }
  void updateEstimate() {
    if (!endManuallyAdjusted) {
      final days = estimatedHours.ceil().clamp(1, 365);
      end = start.add(Duration(days: days));
    }
  }
  Future<void> selectInspection(String id) async {
    setState(() { selectedInspection = id; inspectionChecklist = []; error = ''; });
    if (id == 'custom') { checklist.clear(); return; }
    final inspection = inspectionOptions.where((item) => taskText(item['_id']) == id).firstOrNull;
    if (inspection == null) return;
    setState(() => loadingInspection = true);
    try {
      final name = taskText(inspection['inspectionName']);
      final model = taskText(inspection['aircraftModel']);
      final response = await widget.session.request('/api/inspections/tasks?inspectionName=${Uri.encodeQueryComponent(name)}&aircraftModel=${Uri.encodeQueryComponent(model)}');
      final seen = <String>{};
      final tasks = (response['data'] as List? ?? []).map((item) =>
          Map<String, dynamic>.from(item as Map)).where((item) =>
          taskText(item['taskName']).isNotEmpty &&
          seen.add('${item['taskId']}|${item['taskName']}|${item['inspectionTypeFull']}')).toList();
      if (!mounted || selectedInspection != id) return;
      setState(() {
        inspectionChecklist = tasks;
        title.text = widget.inspectionDraft == null ? name :
          taskText(widget.inspectionDraft!['inspectionName']);
        checklist.text = tasks.isEmpty && widget.inspectionDraft != null ? title.text :
          tasks.map((item) => taskText(item['taskName'])).join('\n');
        updateEstimate();
      });
    } catch (e) { if (mounted) setState(() => error = 'Could not load inspection tasks: $e'); }
    finally { if (mounted) setState(() => loadingInspection = false); }
  }
  Future<void> loadQualifications() async {
    final registration = aircraft.text.trim();
    final current = ++qualificationRequest;
    if (registration.isEmpty) { setState(() { qualifications = []; qualificationError = ''; checkingQualifications = false; }); return; }
    setState(() { checkingQualifications = true; qualificationError = ''; qualifications = []; });
    try {
      final response = await widget.session.request('/api/tasks/qualified-mechanics?aircraft=${Uri.encodeQueryComponent(registration)}');
      if (mounted && current == qualificationRequest) setState(() => qualifications = (response['data'] as List? ?? []).whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList());
    } catch (e) { if (mounted && current == qualificationRequest) setState(() => qualificationError = '$e'); }
    finally { if (mounted && current == qualificationRequest) setState(() => checkingQualifications = false); }
  }
  Map<String, dynamic> qualificationFor(String id) => qualifications.where((item) => '${item['id']}' == id).firstOrNull ?? {};
  Future<void> submit() async {
    final lines = checklist.text.split('\n').map((line) => line.trim()).where((line) => line.isNotEmpty).toList();
    if (title.text.trim().isEmpty || aircraft.text.trim().isEmpty || base.isEmpty ||
        assignee == null || lines.isEmpty) {
      setState(() => error = 'Enter a title, aircraft, base, mechanic, and checklist.'); return;
    }
    if (checkingQualifications || qualificationError.isNotEmpty || qualificationFor(assignee!)['qualified'] != true) {
      setState(() => error = qualificationError.isNotEmpty ? qualificationError : 'Choose a mechanic qualified for this aircraft.'); return;
    }
    setState(() { busy = true; error = ''; });
    try {
      final body = {
        ...?widget.task,
        'title': title.text.trim(), 'aircraft': aircraft.text.trim(),
        'base': base, 'assignedTo': assignee,
        'assignedToName': mechanics.where((user) => taskText(user['_id'] ?? user['id']) == assignee)
          .map((user) => '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim()).firstOrNull ?? '',
        'startDateTime': start.toUtc().toIso8601String(), 'endDateTime': end.toUtc().toIso8601String(),
        'performance': {'estimatedHours': double.parse(estimatedHours.toStringAsFixed(2))},
        'status': widget.task?['status'] ?? 'Pending', 'priority': priority,
        'maintenanceType': widget.task?['maintenanceType'] ??
          (selectedInspection == 'custom' && widget.inspectionDraft == null ? 'Custom Task' :
            widget.inspectionDraft != null ? 'Preventive Maintenance' : 'Inspection'),
        'checklistItems': lines.asMap().entries.map((entry) => {
          if (entry.key < inspectionChecklist.length) ...inspectionChecklist[entry.key],
          'taskId': entry.key < inspectionChecklist.length && taskText(inspectionChecklist[entry.key]['taskId']).isNotEmpty
            ? inspectionChecklist[entry.key]['taskId'] :
            '${widget.inspectionDraft == null && selectedInspection == 'custom' ? 'custom' : 'inspection'}-${DateTime.now().millisecondsSinceEpoch}-${entry.key}',
          'taskName': entry.value,
          'inspectionName': widget.inspectionDraft?['inspectionName'] ??
            (widget.task != null && entry.key < inspectionChecklist.length
              ? inspectionChecklist[entry.key]['inspectionName'] :
              selectedInspection == 'custom' ? title.text.trim() :
              taskText(inspectionOptions.where((item) => taskText(item['_id']) == selectedInspection)
                .firstOrNull?['inspectionName'])),
          'inspectionType': widget.task != null && entry.key < inspectionChecklist.length
            ? inspectionChecklist[entry.key]['inspectionType'] :
            widget.inspectionDraft == null && selectedInspection == 'custom' ? 'Custom' : 'Inspection',
          'inspectionTypeFull': widget.inspectionDraft?['inspectionName'] ??
            (widget.task != null && entry.key < inspectionChecklist.length
              ? inspectionChecklist[entry.key]['inspectionTypeFull'] :
              selectedInspection == 'custom' ? 'Custom Task' : title.text.trim()),
          if (widget.inspectionDraft != null) 'aircraftModel': widget.inspectionDraft!['aircraftModel'],
          if (widget.inspectionDraft != null) 'specificInterval': widget.inspectionDraft!['inspectionName'],
          if (widget.inspectionDraft != null) 'dueAtHours': widget.inspectionDraft!['dueAtHours'],
        }).toList(),
        'confirmAction': true, 'confirmBusyMechanic': true,
      };
      await widget.session.request(widget.task == null ? '/api/tasks/create' : '/api/tasks/${taskId(widget.task!)}',
        method: widget.task == null ? 'POST' : 'PUT', extraHeaders: {'x-action-confirmed': 'true'}, body: body);
      if (mounted) Navigator.pop(context, true);
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: Text(widget.task == null ? 'Add Task' : 'Edit Task')),
    body: ListView(padding: const EdgeInsets.all(16), children: [
      TextField(controller: title, decoration: const InputDecoration(labelText: 'Task title', border: OutlineInputBorder())),
      const SizedBox(height: 12),
      if (widget.task == null && widget.inspectionDraft == null) ...[
        DropdownButtonFormField<String>(key: ValueKey('inspection-$selectedInspection-${inspectionOptions.length}'),
          initialValue: selectedInspection, decoration: const InputDecoration(
            labelText: 'Inspection / task type', border: OutlineInputBorder()),
          items: [const DropdownMenuItem(value: 'custom', child: Text('Custom Task')),
            ...inspectionOptions.map((item) => DropdownMenuItem(value: taskText(item['_id']),
              child: Text(taskText(item['inspectionName']))))],
          onChanged: loadingInspection ? null : (value) { if (value != null) selectInspection(value); }),
        if (loadingInspection) const LinearProgressIndicator(),
        const SizedBox(height: 12),
      ],
      DropdownButtonFormField<String>(key: ValueKey('${aircraft.text}-${aircraftOptions.length}'),
        initialValue: aircraft.text.isEmpty ? null : aircraft.text,
        decoration: const InputDecoration(labelText: 'Aircraft', border: OutlineInputBorder()),
        items: {if (aircraft.text.isNotEmpty) aircraft.text, ...aircraftOptions}.map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(),
        onChanged: (value) { if (value == null) return; aircraft.text = value; assignee = null; loadQualifications(); }),
      const SizedBox(height: 12),
      DropdownButtonFormField<String>(initialValue: base.isEmpty ? null : base,
        decoration: const InputDecoration(labelText: 'Base', border: OutlineInputBorder()),
        items: const ['MANILA', 'CEBU', 'CDO'].map((value) =>
          DropdownMenuItem(value: value, child: Text(value))).toList(),
        onChanged: (value) => setState(() => base = value ?? '')),
      const SizedBox(height: 12),
      if (checkingQualifications) const LinearProgressIndicator(),
      if (qualificationError.isNotEmpty) TextButton(onPressed: loadQualifications, child: Text('Retry qualification check: $qualificationError')),
      DropdownButtonFormField<String>(key: ValueKey('${aircraft.text}-$assignee-${qualifications.length}'),
        initialValue: mechanics.any((user) => taskText(user['_id'] ?? user['id']) == assignee) ? assignee : null,
        decoration: const InputDecoration(labelText: 'Mechanic', border: OutlineInputBorder()),
        items: (mechanics.toList()..sort((a, b) {
          final aQualified = qualificationFor(taskText(a['_id'] ?? a['id']))['qualified'] == true;
          final bQualified = qualificationFor(taskText(b['_id'] ?? b['id']))['qualified'] == true;
          return aQualified == bQualified ? 0 : aQualified ? -1 : 1;
        })).map((user) { final id = taskText(user['_id'] ?? user['id']);
          final qualification = qualificationFor(id);
          return DropdownMenuItem(value: id, enabled: qualification['qualified'] == true,
            child: Text('${user['firstName'] ?? ''} ${user['lastName'] ?? ''} · ${qualification['qualified'] == true ? 'Qualified' : qualification['reason'] ?? 'Check aircraft'}', overflow: TextOverflow.ellipsis)); }).toList(),
        onChanged: (value) => setState(() => assignee = value)),
      if (aircraft.text.isNotEmpty && !checkingQualifications && qualificationError.isEmpty && qualifications.every((item) => item['qualified'] != true))
        const Text('No qualified mechanics found for this aircraft.'),
      DropdownButtonFormField<String>(initialValue: priority, decoration: const InputDecoration(labelText: 'Priority'),
        items: ['Low', 'Normal', 'High'].map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(),
        onChanged: (value) => setState(() => priority = value)),
      ListTile(title: const Text('Start'), subtitle: Text('$start'), trailing: const Icon(Icons.calendar_today),
        onTap: () async { final date = await showDatePicker(context: context, firstDate: DateTime.now(), lastDate: DateTime(2100), initialDate: start);
          if (date != null) setState(() { start = date; updateEstimate(); }); }),
      ListTile(title: const Text('End'), subtitle: Text('$end'), trailing: const Icon(Icons.calendar_today),
        onTap: () async { final date = await showDatePicker(context: context, firstDate: DateTime.now(), lastDate: DateTime(2100), initialDate: end);
          if (date != null) setState(() { end = date; endManuallyAdjusted = true; }); }),
      TextField(controller: checklist, maxLines: 8, decoration: const InputDecoration(
        labelText: 'Checklist items (one per line)', border: OutlineInputBorder()),
        onChanged: (_) => setState(updateEstimate)),
      Text('Estimated duration: ${estimatedHours.toStringAsFixed(2)} hours · ${estimatedHours.ceil()} day(s)'),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      if (busy) const LinearProgressIndicator(),
      const SizedBox(height: 16), FilledButton(onPressed: busy ? null : submit, child: const Text('Save Task')),
    ]));
}
