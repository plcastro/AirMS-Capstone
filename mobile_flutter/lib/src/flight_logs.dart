import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'auth.dart';
import 'flight_create.dart';
import 'flight_signing.dart';
import 'flight_review.dart';
import 'date_time.dart';
import 'linked_inspection.dart';
import 'pdf_exports.dart';
import 'flight_pdf.dart';
import 'viewed_logs.dart';
import 'search.dart';
import 'toast.dart';

Map<String, dynamic> flightMap(dynamic value) => value is Map ? Map<String, dynamic>.from(value) : {};
String flightText(dynamic value) => value == null ? '' : '$value';
String flightAircraft(Map<String, dynamic> log) {
  final registration = flightText(log['rpc'] ?? log['aircraft']).trim().toUpperCase();
  return registration.isEmpty ? 'Unassigned aircraft' : registration;
}
DateTime? flightActivity(Map<String, dynamic> log) {
  for (final key in ['updatedAt', 'createdAt', 'dateAdded', 'date']) {
    final parsed = DateTime.tryParse(flightText(log[key]));
    if (parsed != null) return parsed;
  }
  return null;
}
String flightStage(Map<String, dynamic> log) {
  final stage = flightText(log['status']).trim().toLowerCase();
  if (stage.isEmpty) return 'pending_release';
  if (stage == 'accepted' && log['notifiedForCompletion'] == true) return 'submitted';
  return {'draft': 'pending_release', 'ongoing': 'pending_release', 'released': 'pending_acceptance'}[stage] ?? stage;
}
String flightStageLabel(String stage) => const {
  'pending_release': 'Preparation', 'returned_to_mechanic': 'Returned to mechanic',
  'pending_acceptance': 'Awaiting pilot acceptance', 'accepted': 'Flight details',
  'returned_to_pilot': 'Flight details correction', 'submitted': 'Post-flight review',
  'completed': 'Closed',
}[stage] ?? stage;
String flightNextAction(String stage) => const {
  'pending_release': 'Mechanic preparation',
  'returned_to_mechanic': 'Preparation correction',
  'pending_acceptance': 'Pilot acceptance',
  'accepted': 'Mechanic flight details and completion',
  'returned_to_pilot': 'Mechanic flight details and completion',
  'submitted': 'Mechanic review and closure',
  'completed': 'Record closed',
}[stage] ?? 'Mechanic preparation';

class FlightLogsPage extends StatefulWidget {
  const FlightLogsPage({super.key, required this.session});
  final AirmsSession session;
  @override State<FlightLogsPage> createState() => _FlightLogsPageState();
}
class _FlightLogsPageState extends State<FlightLogsPage> {
  List<Map<String, dynamic>> logs = [];
  String aircraft = '', query = '', aircraftQuery = '', status = 'all', error = '';
  bool loading = true, needsAction = false, refreshing = false;
  Timer? refreshTimer;
  late final ViewedLogs viewed;
  bool viewedReady = false;
  bool needsMyAction(Map<String, dynamic> log) {
    final id = flightText(widget.session.user?['_id'] ?? widget.session.user?['id']);
    if (id.isEmpty) return false;
    final role = flightText(widget.session.user?['jobTitle'] ?? widget.session.user?['role'] ?? widget.session.user?['access'])
      .trim().toLowerCase().replaceAll(RegExp(r'[\s-]+'), ' ');
    final assignedField = role == 'pilot' ? 'assignedPilot' :
      ['mechanic', 'maintenance manager'].contains(role) ? 'assignedMechanic' : '';
    if (assignedField.isEmpty) return false;
    final stage = flightStage(log);
    final field = stage == 'pending_acceptance' ? 'assignedPilot' :
      ['pending_release', 'returned_to_mechanic', 'accepted', 'returned_to_pilot', 'submitted'].contains(stage)
        ? 'assignedMechanic' : '';
    return field == assignedField && flightText(flightMap(log[field])['userId']) == id;
  }
  @override void initState() {
    super.initState();
    viewed = ViewedLogs(flightText(widget.session.user?['_id'] ?? widget.session.user?['id']), 'flight');
    viewed.load().then((_) { if (mounted) setState(() => viewedReady = true); });
    preferences().then((prefs) {
      if (mounted) {
        setState(() => needsAction = prefs.getBool(
          'needs-action:flight:${flightText(widget.session.user?['id'] ?? widget.session.user?['_id'])}') ?? false);
      }
    });
    load();
    refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted && !loading) load(showLoading: false);
    });
  }
  @override void dispose() { refreshTimer?.cancel(); super.dispose(); }
  Future<void> load({bool showLoading = true}) async {
    if (refreshing) return;
    refreshing = true;
    if (showLoading) setState(() => loading = true);
    try {
      Future<dynamic> page(int number) => widget.session.request(
        '/api/flightlogs?page=$number&limit=500&sortBy=updatedAt&sortOrder=desc');
      List<Map<String, dynamic>> records(dynamic response) {
        final data = response is Map ? response['data'] : response;
        final list = data is List ? data : data is Map ? (data['logs'] ?? data['records'] ?? data['items']) : null;
        return (list is List ? list : <dynamic>[]).map(flightMap).toList();
      }
      final first = await page(1);
      final pagination = first is Map ? flightMap(first['pagination']) : <String, dynamic>{};
      final pages = int.tryParse(flightText(pagination['pages'])) ?? 1;
      final remaining = pages > 1
        ? await Future.wait([for (var number = 2; number <= pages; number++) page(number)])
        : <dynamic>[];
      final byId = <String, Map<String, dynamic>>{};
      for (final row in [first, ...remaining].expand(records)) {
        byId[flightText(row['_id'] ?? row['id'])] = row;
      }
      final sorted = byId.values.toList()..sort((left, right) {
        final time = (flightActivity(right)?.millisecondsSinceEpoch ?? 0)
          .compareTo(flightActivity(left)?.millisecondsSinceEpoch ?? 0);
        return time != 0 ? time : flightText(right['_id'] ?? right['id'])
          .compareTo(flightText(left['_id'] ?? left['id']));
      });
      if (mounted) setState(() { logs = sorted; error = ''; });
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { refreshing = false; if (mounted) { setState(() => loading = false); } }
  }
  @override Widget build(BuildContext context) {
    final groupLogs = logs.where((log) => !needsAction || needsMyAction(log)).toList();
    final aircraftFilter = aircraftQuery.trim().toLowerCase();
    final aircrafts = groupLogs.map(flightAircraft).toSet().toList();
    final visible = logs.where((log) {
      if (aircraft.isNotEmpty && flightAircraft(log) != aircraft) return false;
      if (status != 'all' && flightStage(log) != status) return false;
      if (needsAction && !needsMyAction(log)) return false;
      return matchesSearch(query, log);
    }).toList();
    final role = flightText(widget.session.user?['jobTitle'] ?? widget.session.user?['role'] ?? widget.session.user?['access'])
      .trim().toLowerCase().replaceAll(RegExp(r'[\s-]+'), ' ');
    final canCreate = role == 'mechanic' || role == 'maintenance manager';
    final ongoingAircraft = logs.where((log) => const {
      'pending_release', 'pending_acceptance', 'accepted', 'submitted',
      'returned_to_mechanic', 'returned_to_pilot',
    }.contains(flightStage(log))).map(flightAircraft).toSet();
    final aircraftHasOngoing = aircraft.isNotEmpty && ongoingAircraft.contains(aircraft);
    return RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.all(12), children: [
      if (canCreate) FilledButton.icon(onPressed: loading || aircraftHasOngoing ? null : () async {
        if (await Navigator.push<bool>(context, MaterialPageRoute(builder: (_) => FlightCreatePage(
          session: widget.session, ongoing: ongoingAircraft, initialRpc: aircraft))) == true) {
          load();
        }
      }, icon: const Icon(Icons.add), label: const Text('New flight log')),
      if (canCreate && aircraftHasOngoing) const Padding(padding: EdgeInsets.symmetric(vertical: 8),
        child: Text('Complete this aircraft’s ongoing flight log before creating a new entry.',
          style: TextStyle(color: Colors.red))),
      TextField(key: ValueKey(aircraft.isEmpty ? 'aircraft-search' : 'log-search'),
        decoration: InputDecoration(prefixIcon: const Icon(Icons.search),
        hintText: aircraft.isEmpty ? 'Search aircraft' : 'Search flight logs or crew',
        border: const OutlineInputBorder()), onChanged: (value) => setState(() {
          if (aircraft.isEmpty) { aircraftQuery = value; } else { query = value; }
        })),
      CheckboxListTile(value: needsAction, title: const Text('Needs my action'),
        onChanged: (value) async {
          final enabled = value == true;
          setState(() => needsAction = enabled);
          final prefs = await preferences();
          await prefs.setBool('needs-action:flight:${flightText(widget.session.user?['id'] ?? widget.session.user?['_id'])}', enabled);
        }),
      const SizedBox(height: 8),
      if (aircraft.isNotEmpty) TextButton.icon(onPressed: () => setState(() { aircraft = ''; query = ''; status = 'all'; }), icon: const Icon(Icons.arrow_back), label: Text(aircraft)),
      if (aircraft.isEmpty) ...aircrafts.where((name) => matchesSearch(aircraftFilter, name)).map((name) {
        final records = groupLogs.where((log) => flightAircraft(log) == name).toList();
        final fresh = viewedReady ? records.where(viewed.isNew).length : 0;
        final latest = records.isEmpty ? <String, dynamic>{} : records.first;
        return Card(clipBehavior: Clip.antiAlias, child: InkWell(onTap: () => setState(() { aircraft = name; query = ''; status = 'all'; }),
          child: SizedBox(height: 152, child: Row(children: [Container(width: 5, color: Theme.of(context).colorScheme.primary),
            Expanded(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [const Icon(Icons.flight, size: 28), const SizedBox(width: 10), Expanded(child: Text(name,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
                Chip(label: Text('${records.length} ${records.length == 1 ? 'log' : 'logs'}')),
                const Icon(Icons.chevron_right)]),
              if (fresh > 0) Text('$fresh new', style: TextStyle(color: Theme.of(context).colorScheme.primary)),
              Text('Aircraft type: ${flightText(latest['aircraftType']).isEmpty ? 'N/A' : flightText(latest['aircraftType'])}'),
              Text('Base: ${flightText(latest['base']).isEmpty ? 'N/A' : flightText(latest['base'])}'),
              Text('Updated ${formatAirmsDateTime(latest['updatedAt'] ?? latest['createdAt'], fallback: 'N/A')}'),
            ]))),
          ]))));
      }),
      if (aircraft.isNotEmpty) SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: ['all', 'pending_release', 'returned_to_mechanic', 'pending_acceptance', 'accepted', 'returned_to_pilot', 'submitted', 'completed'].map((value) => Padding(padding: const EdgeInsets.only(right: 6), child: ChoiceChip(label: Text(value == 'all' ? 'All' : flightStageLabel(value)), selected: status == value, onSelected: (_) => setState(() => status = value)))).toList())),
      if (loading) const Center(child: CircularProgressIndicator()),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      if (aircraft.isNotEmpty) ...visible.map((log) {
        final action = needsMyAction(log);
        final stage = flightStage(log);
        final crewField = stage == 'pending_acceptance' ? 'assignedPilot' : stage == 'completed' ? '' : 'assignedMechanic';
        final crewName = crewField.isEmpty ? '' : flightText(flightMap(log[crewField])['name']);
        return Card(clipBehavior: Clip.antiAlias, child: InkWell(onTap: () async {
          await viewed.markViewed(log);
          if (!context.mounted) return;
          setState(() {});
          await Navigator.push(context, MaterialPageRoute(builder: (_) => FlightWorkspacePage(session: widget.session, id: flightText(log['_id']))));
          load();
        }, child: Row(children: [Container(width: 5, height: 108,
          color: action ? Theme.of(context).colorScheme.primary : Colors.grey.shade400),
          Expanded(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [Expanded(child: Text('${flightText(log['controlNo']).isEmpty ? 'Flight Log' : flightText(log['controlNo'])}${viewedReady && viewed.isNew(log) ? ' · NEW' : ''}',
              style: const TextStyle(fontWeight: FontWeight.bold))),
              Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: action ? Theme.of(context).colorScheme.primaryContainer : Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(20)), child: Text(flightStageLabel(stage), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold))) ]),
            Text('Date: ${flightText(log['date']).isEmpty ? 'N/A' : flightText(log['date'])}'),
            Text('Updated: ${formatAirmsDateTime(log['updatedAt'] ?? log['createdAt'], fallback: 'N/A')}'),
            Text('Next: ${flightNextAction(stage)}${crewField.isEmpty ? '' : ' — ${crewName.isEmpty ? 'Unassigned' : crewName}'}'),
          ]))),
        ])));
      }),
      if (!loading && aircraft.isNotEmpty && visible.isEmpty) const Center(child: Padding(padding: EdgeInsets.all(24), child: Text('No flight logs found'))),
    ]));
  }
}

class FlightWorkspacePage extends StatefulWidget {
  const FlightWorkspacePage({super.key, required this.session, required this.id, this.initialTab = 'flight'});
  final AirmsSession session;
  final String id;
  final String initialTab;
  @override State<FlightWorkspacePage> createState() => _FlightWorkspacePageState();
}
class _FlightWorkspacePageState extends State<FlightWorkspacePage> {
  Map<String, dynamic> workspace = {}, draft = {};
  Map<String, dynamic> recovery = {};
  List<Map<String, dynamic>> pilots = [];
  String error = '';
  late String tab;
  String flightPane = 'basic';
  bool loading = true, saving = false;
  int restoreGeneration = 0;
  Timer? draftTimer;
  String get draftKey => 'airms:flight-draft:${flightText(widget.session.user?['id'] ?? widget.session.user?['_id'])}:${widget.id}';
  @override void initState() { super.initState(); tab = widget.initialTab; load(); loadPilots(); loadRecovery(); }
  @override void dispose() {
    draftTimer?.cancel();
    if (draft.isNotEmpty) {
      unawaited(persistDraftSnapshot(Map<String, dynamic>.from(draft),
        flightMap(workspace['flightLog'])['__v'] ?? 0));
    }
    super.dispose();
  }
  Future<void> persistDraftSnapshot(Map<String, dynamic> changes, dynamic version) async {
    final prefs = await preferences();
    await prefs.setString(draftKey, jsonEncode({
      'changes': changes, 'version': version,
      'savedAt': DateTime.now().toIso8601String(),
    }));
  }
  Future<void> loadRecovery() async {
    try {
      final saved = (await preferences()).getString(draftKey);
      if (saved == null) return;
      final value = flightMap(jsonDecode(saved));
      if (mounted && flightMap(value['changes']).isNotEmpty) {
        setState(() => recovery = value);
      }
    } catch (_) {}
  }
  void updateDraft(VoidCallback change) {
    setState(change);
    draftTimer?.cancel();
    draftTimer = Timer(const Duration(milliseconds: 400), () async {
      if (draft.isEmpty) { await (await preferences()).remove(draftKey); return; }
      await persistDraftSnapshot(Map<String, dynamic>.from(draft),
        flightMap(workspace['flightLog'])['__v'] ?? 0);
    });
  }
  Future<void> discardStoredDraft() async {
    draftTimer?.cancel();
    await (await preferences()).remove(draftKey);
    if (mounted) setState(() => recovery = {});
  }
  Future<void> loadPilots() async {
    try {
      final result = await widget.session.request('/api/flightlogs/crew-options');
      if (mounted) setState(() => pilots = (result['data'] as List? ?? []).map(flightMap).where((item) => flightText(item['role']).toLowerCase() == 'pilot').toList());
    } catch (_) {}
  }
  Future<void> load() async {
    setState(() => loading = true);
    try {
      final result = await widget.session.request('/api/flightlogs/${widget.id}/workspace');
      if (mounted) { setState(() {
        final fresh = flightMap(result['data']);
        final oldVersion = flightMap(workspace['flightLog'])['__v'];
        final newVersion = flightMap(fresh['flightLog'])['__v'];
        if (draft.isNotEmpty && oldVersion != newVersion) {
          recovery = {'changes': draft, 'version': oldVersion, 'savedAt': DateTime.now().toIso8601String()};
          draft = {};
        }
        workspace = fresh;
        error = '';
      }); }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => loading = false); }
  }
  Future<void> addInspectionPair() async {
    final log = flightMap(workspace['flightLog']);
    setState(() { saving = true; error = ''; });
    try {
      await widget.session.request('/api/flightlogs/${widget.id}/inspections',
        method: 'POST', body: {'expectedVersion': log['__v'] ?? 0, 'confirmAction': true},
        extraHeaders: {'x-action-confirmed': 'true'});
      await load();
      if (mounted) {
        AirmsToast.show('Linked Pre-Flight and Post-Flight inspections created.');
      }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => saving = false); }
  }
  Future<void> shareHistory() async {
    final box = context.findRenderObject() as RenderBox?;
    try {
      await SharePlus.instance.share(ShareParams(
        title: 'AirMS flight record and audit history',
        text: const JsonEncoder.withIndent('  ').convert(workspace),
        sharePositionOrigin: box == null ? null : box.localToGlobal(Offset.zero) & box.size,
      ));
    } catch (e) { if (mounted) setState(() => error = '$e'); }
  }
  Future<void> save() async {
    final validation = servicingError();
    if (validation.isNotEmpty) { setState(() => error = validation); return; }
    setState(() => saving = true);
    try {
      final log = flightMap(workspace['flightLog']);
      await widget.session.request('/api/flightlogs/${widget.id}', method: 'PUT', body: {'changes': draft, 'expectedVersion': log['__v'] ?? 0, 'confirmAction': true}, extraHeaders: {'x-action-confirmed': 'true'});
      await discardStoredDraft();
      if (mounted) setState(() => draft = {});
      await load();
      if (mounted) AirmsToast.show('Draft saved');
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => saving = false); }
  }
  Future<void> accept() async {
    final log = flightMap(workspace['flightLog']);
    final signature = await collectFlightSignature(context, widget.session);
    if (signature == null) return;
    setState(() => saving = true);
    try {
      await widget.session.request('/api/flightlogs/${widget.id}/accept', method: 'PUT', body: {
        'expectedVersion': log['__v'] ?? 0, 'signature': signature.image, 'pin': signature.pin, 'confirmAction': true,
      }, extraHeaders: {'x-action-confirmed': 'true'});
      await load();
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => saving = false); }
  }
  Future<void> returnForCorrection() async {
    final comment = await _askFlightText('Return for correction', 'Explain what needs correcting');
    if (comment == null || comment.trim().isEmpty) return;
    final log = flightMap(workspace['flightLog']);
    setState(() { saving = true; error = ''; });
    try {
      await widget.session.request('/api/flightlogs/${widget.id}/return', method: 'PUT', body: {
        'changes': draft, 'comment': comment.trim(), 'expectedVersion': log['__v'] ?? 0,
        'confirmAction': true,
      }, extraHeaders: {'x-action-confirmed': 'true'});
      await discardStoredDraft();
      if (mounted) setState(() => draft = {});
      await load();
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => saving = false); }
  }
  Future<void> release() async {
    final log = flightMap(workspace['flightLog']);
    final validation = servicingError();
    if (validation.isNotEmpty) { setState(() => error = validation); return; }
    final timeError = flightTimeError(log);
    if (timeError.isNotEmpty) { setState(() => error = timeError); return; }
    final mechanicId = flightText(flightMap(log['assignedMechanic'])['userId']);
    final inspections = (workspace['preInspections'] as List? ?? []).map(flightMap);
    String signatureData = '';
    for (final inspection in inspections) {
      final signer = flightMap(inspection['releasedBy']);
      if (['released', 'completed'].contains(inspection['status']) && flightText(signer['userId']) == mechanicId && flightText(signer['signature']).isNotEmpty) {
        signatureData = flightText(signer['signature']); break;
      }
    }
    if (signatureData.isEmpty && flightText(flightMap(log['initialInspectionSignature'])['userId']) == mechanicId) {
      signatureData = flightText(flightMap(log['initialInspectionSignature'])['signature']);
    }
    if (signatureData.isEmpty) { setState(() => error = 'Complete and sign the linked Pre-Flight inspection before releasing the flight log.'); return; }
    final signature = await collectFlightSignature(context, widget.session, existing: signatureData);
    if (signature == null) return;
    setState(() => saving = true);
    try {
      await widget.session.request('/api/flightlogs/${widget.id}/release', method: 'PUT', body: {
        'changes': draft, 'expectedVersion': log['__v'] ?? 0,
        'signature': signature.image, 'pin': signature.pin, 'confirmAction': true,
      }, extraHeaders: {'x-action-confirmed': 'true'});
      await discardStoredDraft();
      if (mounted) setState(() => draft = {});
      await load();
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => saving = false); }
  }
  List<Map<String, dynamic>> currentLegs(Map<String, dynamic> log) {
    final source = draft['legs'] ?? log['legs'];
    return (source is List ? source : <dynamic>[]).map(flightMap).toList();
  }
  String servicingError() {
    const standard = <String, List<String>>{
      'fuelServicing': ['mainRemG', 'mainAdd', 'mainTotal'],
      'oilServicing': ['engineRem', 'engineAdd', 'engineTot', 'mrGboxRem',
        'mrGboxAdd', 'mrGboxTot', 'trGboxRem', 'trGboxAdd', 'trGboxTot'],
    };
    for (final section in standard.entries) {
      final rows = draft[section.key];
      if (rows is! List) continue;
      for (var index = 0; index < rows.length; index++) {
        final row = flightMap(rows[index]);
        for (final field in section.value) {
          final value = flightText(row[field]).trim();
          if (value.isEmpty) continue;
          final quantity = num.tryParse(value);
          if (quantity == null || quantity < 0) return '${section.key} row ${index + 1}: $field must be a nonnegative number.';
        }
      }
    }
    final b412 = draft['b412Data'];
    if (b412 is Map) {
      final data = flightMap(b412);
      final fuel = data['fuelServicing'];
      if (fuel is List) {
        for (var index = 0; index < fuel.length; index++) {
          final row = flightMap(fuel[index]);
          for (final field in const ['mainTankRemaining', 'mainTankAdded', 'mainTankTotal']) {
            final value = flightText(row[field]).trim();
            if (value.isNotEmpty && (num.tryParse(value) == null || num.parse(value) < 0)) {
              return 'Bell 412 fuel row ${index + 1}: $field must be a nonnegative number.';
            }
          }
        }
      }
      final oil = data['oilServicing'];
      if (oil is List) {
        for (var index = 0; index < oil.length; index++) {
          final row = flightMap(oil[index]);
          for (final component in const ['engine1', 'engine2', 'mrGearbox', 'reductionGearbox', 'tr42Gearbox', 'tr90Gearbox']) {
            final values = flightMap(row[component]);
            for (final field in const ['remaining', 'added', 'total']) {
              final value = flightText(values[field]).trim();
              if (value.isNotEmpty && (num.tryParse(value) == null || num.parse(value) < 0)) {
                return 'Bell 412 oil row ${index + 1}: $component $field must be a nonnegative number.';
              }
            }
          }
        }
      }
    }
    return '';
  }
  String flightTimeError(Map<String, dynamic> log) {
    final legs = currentLegs(log);
    if (legs.isEmpty) return 'Add a leg and enter Total flight time.';
    for (var index = 0; index < legs.length; index++) {
      var value = flightText(legs[index]['totalTimeOff']).trim();
      final decimal = double.tryParse(value);
      if (!value.contains(':') && decimal != null && decimal >= 0 && decimal < 100) {
        final minutes = (decimal * 60).round();
        value = '${(minutes ~/ 60).toString().padLeft(2, '0')}:${(minutes % 60).toString().padLeft(2, '0')}';
      }
      final match = RegExp(r'^(\d{2}):(\d{2})$').firstMatch(value);
      if (match == null || int.parse(match.group(2)!) > 59) {
        return 'Leg ${index + 1}: enter Total flight time as HH:mm (minutes 00–59).';
      }
    }
    return '';
  }
  void changeLeg(Map<String, dynamic> log, int index, String key, String value) {
    final legs = currentLegs(log);
    legs[index] = {...legs[index], key: value};
    updateDraft(() => draft['legs'] = legs);
  }
  List<Map<String, dynamic>> servicingRows(Map<String, dynamic> log, String key) {
    final source = draft[key] ?? log[key];
    return (source is List ? source : <dynamic>[]).map(flightMap).toList();
  }
  void changeServicing(Map<String, dynamic> log, String section, int index, String key, String value) {
    final rows = servicingRows(log, section);
    while (rows.length <= index) { rows.add(<String, dynamic>{}); }
    rows[index] = {...rows[index], key: value};
    updateDraft(() => draft[section] = rows);
  }
  Map<String, dynamic> componentPeriod(Map<String, dynamic> log, String period) {
    final source = flightMap(draft['componentData'] ?? log['componentData']);
    return flightMap(source[period]);
  }
  void changeComponent(Map<String, dynamic> log, String period, String field, String value) {
    final source = flightMap(draft['componentData'] ?? log['componentData']);
    source[period] = {...flightMap(source[period]), field: value};
    updateDraft(() => draft['componentData'] = source);
  }
  Widget componentField(Map<String, dynamic> log, String period, String field, String label, bool editable) {
    final value = flightText(componentPeriod(log, period)[field]);
    if (!editable) return ListTile(dense: true, title: Text(label), subtitle: Text(value.isEmpty ? '—' : value));
    return Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: TextFormField(
      key: ValueKey('${widget.id}-${log['__v']}-$restoreGeneration-$period-$field'), initialValue: value,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
      onChanged: (next) => changeComponent(log, period, field, next),
    ));
  }
  List<Map<String, dynamic>> workRows(Map<String, dynamic> log) =>
    ((draft['workItems'] ?? log['workItems']) as List? ?? []).map(flightMap).toList();
  void changeWork(Map<String, dynamic> log, int index, String field, dynamic value) {
    final rows = workRows(log);
    rows[index] = {...rows[index], field: value};
    updateDraft(() => draft['workItems'] = rows);
  }
  Widget workField(Map<String, dynamic> log, int index, String field, String label, bool editable, {int lines = 1}) {
    final value = flightText(workRows(log)[index][field]);
    if (!editable) return ListTile(dense: true, title: Text(label), subtitle: Text(value.isEmpty ? '—' : value));
    return Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: TextFormField(
      key: ValueKey('${widget.id}-${log['__v']}-$restoreGeneration-work-$index-$field'), initialValue: value,
      maxLines: lines, decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
      onChanged: (next) => changeWork(log, index, field, next),
    ));
  }
  Widget servicingField(Map<String, dynamic> log, String section, int index, String key, String label, bool editable) {
    final rows = servicingRows(log, section);
    final value = index < rows.length ? flightText(rows[index][key]) : '';
    if (!editable) return ListTile(dense: true, title: Text(label), subtitle: Text(value.isEmpty ? '—' : value));
    return Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: TextFormField(
      key: ValueKey('${widget.id}-${log['__v']}-$restoreGeneration-$section-$index-$key'), initialValue: value,
      keyboardType: ['mainRemG', 'mainAdd', 'mainTotal', 'engineRem', 'engineAdd', 'engineTot',
        'mrGboxRem', 'mrGboxAdd', 'mrGboxTot', 'trGboxRem', 'trGboxAdd', 'trGboxTot'].contains(key)
        ? const TextInputType.numberWithOptions(decimal: true) : TextInputType.text,
      decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
      onChanged: (next) => changeServicing(log, section, index, key, next),
    ));
  }
  Widget servicingSignature(Map<String, dynamic> log, String section, int index, bool editable) {
    final rows = servicingRows(log, section);
    final saved = index < rows.length ? flightText(rows[index]['signature']) : '';
    final inherited = flightText(flightMap(log['initialInspectionSignature'])['signature']);
    final signed = inherited.isNotEmpty || saved.isNotEmpty;
    return ListTile(
      leading: Icon(signed ? Icons.verified_outlined : Icons.draw_outlined),
      title: Text(signed ? 'Servicing signed' : 'Servicing signature required'),
      subtitle: inherited.isNotEmpty ? const Text('Uses the verified inspection signature') : null,
      trailing: editable && inherited.isEmpty ? TextButton(onPressed: () async {
        final signature = await collectFlightSignature(context, widget.session, existing: saved.isEmpty ? null : saved);
        if (signature != null && mounted) changeServicing(log, section, index, 'signature', signature.image);
      }, child: Text(signed ? 'Update' : 'Sign')) : null,
    );
  }
  dynamic b412Value(Map<String, dynamic> log, List<Object> path) {
    dynamic value = draft['b412Data'] ?? log['b412Data'];
    for (final part in path) {
      if (part is String && value is Map) {
        value = value[part];
      } else if (part is int && value is List && part < value.length) {
        value = value[part];
      } else {
        return null;
      }
    }
    return value;
  }
  void changeB412(Map<String, dynamic> log, List<Object> path, String value) {
    final data = flightMap(jsonDecode(jsonEncode(draft['b412Data'] ?? log['b412Data'] ?? <String, dynamic>{})));
    dynamic cursor = data;
    for (var index = 0; index < path.length - 1; index++) {
      final part = path[index], next = path[index + 1];
      if (part is String && cursor is Map) {
        cursor = cursor.putIfAbsent(part, () => next is int ? <dynamic>[] : <String, dynamic>{});
      } else if (part is int && cursor is List) {
        while (cursor.length <= part) { cursor.add(next is int ? <dynamic>[] : <String, dynamic>{}); }
        cursor = cursor[part];
      }
    }
    final last = path.last;
    if (last is String && cursor is Map) cursor[last] = value;
    if (last is int && cursor is List) {
      while (cursor.length <= last) { cursor.add(''); }
      cursor[last] = value;
    }
    updateDraft(() => draft['b412Data'] = data);
  }
  Widget b412Field(Map<String, dynamic> log, List<Object> path, String label, bool editable) {
    final value = flightText(b412Value(log, path));
    if (!editable) return ListTile(dense: true, title: Text(label), subtitle: Text(value.isEmpty ? '—' : value));
    return Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: TextFormField(
      key: ValueKey('${widget.id}-${log['__v']}-$restoreGeneration-${path.join('.')}'), initialValue: value,
      decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
      onChanged: (next) => changeB412(log, path, next),
    ));
  }
  Widget b412Signature(Map<String, dynamic> log, List<Object> path, String label, bool editable) {
    final saved = flightText(b412Value(log, path));
    final inherited = flightText(flightMap(log['initialInspectionSignature'])['signature']);
    return ListTile(title: Text(label), leading: Icon(saved.isNotEmpty || inherited.isNotEmpty ? Icons.verified_outlined : Icons.draw_outlined),
      subtitle: Text(inherited.isNotEmpty ? 'Verified inspection signature' : saved.isNotEmpty ? 'Signed' : 'Unsigned'),
      trailing: editable && inherited.isEmpty ? TextButton(onPressed: () async {
        final signature = await collectFlightSignature(context, widget.session, existing: saved.isEmpty ? null : saved);
        if (signature != null && mounted) changeB412(log, path, signature.image);
      }, child: Text(saved.isEmpty ? 'Sign' : 'Update')) : null);
  }
  void changeStations(Map<String, dynamic> log, int index, int stationIndex, String key, String value) {
    final legs = currentLegs(log);
    final stations = (legs[index]['stations'] as List? ?? []).map(flightMap).toList();
    if (stations.isEmpty) stations.add({'from': '', 'to': ''});
    stations[stationIndex] = {...stations[stationIndex], key: value};
    if (key == 'from' && stationIndex > 0) {
      stations[stationIndex - 1] = {...stations[stationIndex - 1], 'to': value};
    }
    if (key == 'to' && stationIndex < stations.length - 1) {
      stations[stationIndex + 1] = {...stations[stationIndex + 1], 'from': value};
    }
    legs[index] = {...legs[index], 'stations': stations};
    updateDraft(() => draft['legs'] = legs);
  }
  void addStation(Map<String, dynamic> log, int legIndex) {
    final legs = currentLegs(log);
    final stations = (legs[legIndex]['stations'] as List? ?? []).map(flightMap).toList();
    if (stations.isEmpty) stations.add({'from': '', 'to': ''});
    stations.add({'from': flightText(stations.last['to']), 'to': ''});
    legs[legIndex] = {...legs[legIndex], 'stations': stations};
    updateDraft(() => draft['legs'] = legs);
  }
  void removeStation(Map<String, dynamic> log, int legIndex, int stationIndex) {
    final legs = currentLegs(log);
    final stations = (legs[legIndex]['stations'] as List? ?? []).map(flightMap).toList();
    if (stations.length <= 1) return;
    stations.removeAt(stationIndex);
    if (stationIndex > 0 && stationIndex < stations.length) {
      stations[stationIndex] = {...stations[stationIndex], 'from': flightText(stations[stationIndex - 1]['to'])};
    }
    legs[legIndex] = {...legs[legIndex], 'stations': stations};
    updateDraft(() => draft['legs'] = legs);
  }
  Widget legField(Map<String, dynamic> log, int index, String key, String label, {int? stationIndex, bool editable = true}) {
    final leg = currentLegs(log)[index];
    final stations = (leg['stations'] as List? ?? []).map(flightMap).toList();
    final value = stationIndex == null ? flightText(leg[key]) :
      stationIndex < stations.length ? flightText(stations[stationIndex][key]) : '';
    if (!editable) return ListTile(dense: true, title: Text(label), subtitle: Text(value.isEmpty ? '—' : value));
    return Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: TextFormField(
      key: ValueKey('${widget.id}-${log['__v']}-$restoreGeneration-$index-${stationIndex ?? 'leg'}-$key'), initialValue: value,
      decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
      onChanged: (next) => stationIndex == null ? changeLeg(log, index, key, next) :
        changeStations(log, index, stationIndex, key, next),
    ));
  }
  Future<void> complete() async {
    final log = flightMap(workspace['flightLog']);
    final validation = servicingError();
    if (validation.isNotEmpty) { setState(() => error = validation); return; }
    setState(() { saving = true; error = ''; });
    try {
      final reviewResult = await widget.session.request('/api/flightlogs/${widget.id}/review', method: 'POST',
        body: {'changes': draft, 'expectedVersion': log['__v'] ?? 0, 'confirmAction': true}, extraHeaders: {'x-action-confirmed': 'true'});
      final review = flightMap(reviewResult['data']);
      if (!mounted) return;
      final decision = await Navigator.push<ClosureReviewDecision>(context,
        MaterialPageRoute(builder: (_) => FlightClosureReviewPage(review: review)));
      if (decision == null || !mounted) return;
      if (decision.reconcileReason != null) {
        final signed = await collectFlightSignature(context, widget.session);
        if (signed == null) return;
        await widget.session.request('/api/flightlogs/${widget.id}/reconcile', method: 'PUT', body: {
          'expectedVersion': log['__v'] ?? 0, 'comment': decision.reconcileReason,
          'signature': signed.image, 'pin': signed.pin, 'confirmAction': true,
        }, extraHeaders: {'x-action-confirmed': 'true'});
        await load();
        if (mounted) setState(() => error = 'Monitoring baseline reconciled. Review the updated flight totals before closing.');
        return;
      }
      final posts = (workspace['postInspections'] as List? ?? []).map(flightMap).toList();
      if (posts.isEmpty) throw const ApiException('Add the linked Post-Flight inspection before closing.');
      final post = posts.first;
      final b412 = flightText(post['aircraftType']).contains('412');
      final checklist = jsonDecode(await rootBundle.loadString(b412 ? 'assets/b412PostInspectionChecklist.json' : 'assets/as350InspectionChecklist.json')) as Map<String, dynamic>;
      final raw = b412 ? (checklist['sections'] as List).expand((section) => (section as Map)['items'] as List).toList() : checklist['post'] as List;
      final checks = b412 ? flightMap(flightMap(post['b412Data'])['checks']) : post;
      final checked = raw.where((item) => checks[(item as Map)['key']] == true).map((item) => '${(item as Map)['key']}').toList();
      if (checked.length != raw.length) throw const ApiException('Complete every linked Post-Flight item before closing.');
      if (flightMap(post['confirmation'])['allGood'] != true) throw const ApiException('Sign the linked Post-Flight inspection before closing.');
      if (!mounted) return;
      final resolution = await _askFlightText('Post-Flight resolution',
        'Describe how post-flight discrepancies were resolved (if any)');
      if (resolution == null || !mounted) return;
      final initial = flightText(flightMap(log['initialInspectionSignature'])['signature']);
      final signature = await collectFlightSignature(context, widget.session, existing: initial.isEmpty ? null : initial);
      if (signature == null) return;
      await widget.session.request('/api/flightlogs/${widget.id}/complete', method: 'PUT', body: {
        'changes': draft, 'expectedVersion': log['__v'] ?? 0, 'signature': signature.image, 'pin': signature.pin,
        'postFlightConfirmation': {'allGood': true, 'appendSignature': true, 'checked': checked,
          'discrepancies': post['discrepancies'] ?? {}, 'inspectionId': post['_id'], 'resolution': resolution},
        'confirmAction': true,
      }, extraHeaders: {'x-action-confirmed': 'true'});
      await discardStoredDraft();
      if (mounted) setState(() => draft = {});
      await load();
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => saving = false); }
  }
  Future<String?> _askFlightText(String title, String label) async {
    final controller = TextEditingController();
    final value = await showDialog<String>(context: context, builder: (dialogContext) => AlertDialog(
      title: Text(title), content: TextField(controller: controller, maxLines: 4, decoration: InputDecoration(labelText: label)),
      actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(dialogContext, controller.text.trim()), child: const Text('Continue'))],
    ));
    controller.dispose(); return value;
  }
  Future<void> amend() async {
    final log = flightMap(workspace['flightLog']);
    String field = 'flight_details';
    final after = TextEditingController(), reason = TextEditingController();
    final approved = await showDialog<bool>(context: context, builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, update) => AlertDialog(
      title: const Text('Record amendment'),
      content: SizedBox(width: 420, child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Text('The original closed record remains intact. Usage corrections also require maintenance ledger reconciliation.'),
        DropdownButtonFormField<String>(initialValue: field, decoration: const InputDecoration(labelText: 'Section'),
          items: const ['flight_details', 'maintenance_work', 'servicing', 'discrepancies']
            .map((value) => DropdownMenuItem(value: value, child: Text(value.replaceAll('_', ' ')))).toList(),
          onChanged: (value) => update(() => field = value ?? 'flight_details')),
        TextField(controller: after, maxLines: 3, decoration: const InputDecoration(labelText: 'Corrected information')),
        TextField(controller: reason, maxLines: 3, decoration: const InputDecoration(labelText: 'Reason')),
      ]))),
      actions: [TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Review and sign'))],
    )));
    final corrected = after.text.trim(), comment = reason.text.trim();
    after.dispose(); reason.dispose();
    if (approved != true || corrected.isEmpty || comment.isEmpty || !mounted) {
      if (approved == true && mounted) setState(() => error = 'Enter the correction and reason.');
      return;
    }
    final signed = await collectFlightSignature(context, widget.session);
    if (signed == null) return;
    setState(() { saving = true; error = ''; });
    try {
      await widget.session.request('/api/flightlogs/${widget.id}/amend', method: 'PUT', body: {
        'correction': {'field': field, 'after': corrected}, 'comment': comment,
        'expectedVersion': log['__v'] ?? 0, 'signature': signed.image, 'pin': signed.pin,
        'confirmAction': true,
      }, extraHeaders: {'x-action-confirmed': 'true'});
      await load();
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => saving = false); }
  }
  Future<void> exportPdf() async {
    try {
      await shareFlightLogTemplatePdf(flightMap(workspace['flightLog']), workspace);
    } catch (_) {
      await exportSummaryPdf();
    }
  }
  Future<void> exportSummaryPdf() async {
    final log = flightMap(workspace['flightLog']);
    final rows = <List<String>>[];
    void add(String section, String field, dynamic value) {
      if (value == null || value == '') return;
      final content = flightText(value);
      if (content.startsWith('data:image/')) return;
      rows.add([section, field, content.length > 240 ? '${content.substring(0, 240)}...' : content]);
    }
    for (final key in ['controlNo', 'rpc', 'aircraftType', 'date', 'status', 'flightPurpose', 'purposeDetails', 'remarks', 'noDefectsReported']) {
      add('Flight record', key, log[key]);
    }
    for (final key in ['assignedPilot', 'assignedMechanic']) {
      final crew = flightMap(log[key]); add('Crew', key, crew['name'] ?? crew['userId']);
    }
    for (final (section, source) in [
      ('Leg', log['legs']), ('Fuel servicing', log['fuelServicing']), ('Oil servicing', log['oilServicing']),
      ('Maintenance work', log['workItems']), ('Defect', workspace['defects']), ('Amendment', workspace['amendments']),
    ]) {
      final entries = source is List ? source : <dynamic>[];
      for (var index = 0; index < entries.length; index++) {
        final item = flightMap(entries[index]);
        for (final entry in item.entries) {
          if (entry.key.startsWith('_') || entry.key.toLowerCase().contains('signature')) continue;
          add('$section ${index + 1}', entry.key, entry.value is Map || entry.value is List ? jsonEncode(entry.value) : entry.value);
        }
      }
    }
    final b412 = flightMap(log['b412Data']);
    for (final entry in b412.entries) {
      if (entry.key == 'fuelServicing' || entry.key == 'oilServicing') continue;
      add('B412 details', entry.key, entry.value is Map || entry.value is List ? jsonEncode(entry.value) : entry.value);
    }
    try {
      await shareAirmsPdf(title: 'Flight Log ${flightText(log['controlNo'])}',
        fileName: 'Flight-Log-${flightText(log['controlNo']).isEmpty ? widget.id : flightText(log['controlNo'])}.pdf',
        subtitle: '${flightText(log['rpc'])} · ${flightText(log['date'])} · ${flightStageLabel(flightStage(log))}',
        columns: const ['Section', 'Field', 'Value'], rows: rows);
    } catch (e) { if (mounted) setState(() => error = '$e'); }
  }
  Future<void> editDefect([Map<String, dynamic>? existing]) async {
    final description = TextEditingController(text: flightText(existing?['description']));
    final evidence = TextEditingController(text: flightText(existing?['evidence']));
    final resolution = TextEditingController(text: flightText(existing?['resolution']));
    final reference = TextEditingController(text: flightText(existing?['deferralReference']));
    final due = TextEditingController(text: flightText(existing?['dueDate']).split('T').first);
    String status = flightText(existing?['status']).isEmpty ? 'open' : flightText(existing?['status']);
    final accepted = await showDialog<String>(context: context, builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, update) => AlertDialog(
      title: Text(existing == null ? 'Report defect' : 'Defect disposition'),
      content: SizedBox(width: 420, child: ListView(shrinkWrap: true, children: [
        TextField(controller: description, enabled: existing == null, maxLines: 3, decoration: const InputDecoration(labelText: 'Description')),
        TextField(controller: evidence, enabled: existing == null, decoration: const InputDecoration(labelText: 'Evidence HTTPS link (optional)')),
        DropdownButtonFormField<String>(initialValue: status, decoration: const InputDecoration(labelText: 'Status'),
          items: const ['open', 'rectified', 'deferred'].map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(),
          onChanged: (value) => update(() => status = value ?? 'open')),
        if (status != 'open') TextField(controller: resolution, maxLines: 3, decoration: const InputDecoration(labelText: 'Corrective work or limitations')),
        if (status == 'deferred') ...[
          TextField(controller: reference, decoration: const InputDecoration(labelText: 'Approved deferral basis')),
          TextField(controller: due, decoration: const InputDecoration(labelText: 'Correction deadline (YYYY-MM-DD)')),
        ],
      ])),
      actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(dialogContext, status), child: const Text('Continue'))],
    )));
    if (accepted == null) { description.dispose(); evidence.dispose(); resolution.dispose(); reference.dispose(); due.dispose(); return; }
    final body = <String, dynamic>{'description': description.text.trim(), 'evidence': evidence.text.trim(),
      'status': accepted, 'resolution': resolution.text.trim(), 'deferralReference': reference.text.trim(),
      'dueDate': accepted == 'deferred' ? due.text.trim() : null,
      'expectedVersion': flightMap(workspace['flightLog'])['__v'] ?? 0,
      'defectVersion': existing?['__v'] ?? 0, 'confirmAction': true};
    description.dispose(); evidence.dispose(); resolution.dispose(); reference.dispose(); due.dispose();
    if (accepted != 'open') {
      if (!mounted) return;
      final signature = await collectFlightSignature(context, widget.session);
      if (signature == null) return;
      body['signature'] = signature.image; body['pin'] = signature.pin;
    }
    setState(() => saving = true);
    try {
      await widget.session.request('/api/flightlogs/${widget.id}/defects${existing == null ? '' : '/${existing['_id']}' }',
        method: existing == null ? 'POST' : 'PUT', body: body, extraHeaders: {'x-action-confirmed': 'true'});
      await load();
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => saving = false); }
  }
  Widget field(Map<String, dynamic> log, String key, String label, {bool editable = false, int lines = 1}) {
    final value = flightText(draft[key] ?? log[key]);
    if (!editable) return ListTile(dense: true, title: Text(label), subtitle: Text(value.isEmpty ? '—' : value));
    return Padding(padding: const EdgeInsets.symmetric(vertical: 5), child: TextFormField(
      key: ValueKey('${widget.id}-$key-${log['__v']}-$restoreGeneration'), initialValue: value, maxLines: lines,
      decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
      onChanged: (value) => updateDraft(() => draft[key] = value),
    ));
  }
  Widget section(String title, List<Widget> children) => Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: Theme.of(context).textTheme.titleMedium), const SizedBox(height: 8), ...children])));
  @override Widget build(BuildContext context) {
    final log = flightMap(workspace['flightLog']);
    final role = flightText(widget.session.user?['jobTitle']).trim().isNotEmpty
      ? flightText(widget.session.user?['jobTitle']).toLowerCase()
      : flightText(widget.session.user?['access']).toLowerCase();
    final myId = flightText(widget.session.user?['_id'] ?? widget.session.user?['id']);
    final assigned = myId.isNotEmpty && flightText(flightMap(log['assignedMechanic'])['userId']) == myId;
    final stage = flightStage(log);
    final preparation = assigned && ['pending_release', 'returned_to_mechanic'].contains(stage);
    final flightDetails = assigned && ['accepted', 'returned_to_pilot', 'submitted'].contains(stage);
    final canEdit = (preparation || flightDetails) && ['mechanic', 'maintenance manager', 'officer-in-charge'].contains(role);
    final pilotAssigned = myId.isNotEmpty && flightText(flightMap(log['assignedPilot'])['userId']) == myId;
    final canReturn = assigned && !['mechanic', 'maintenance manager'].contains(role) &&
      ['pending_acceptance', 'submitted'].contains(stage);
    List<dynamic> entries(String key) => workspace[key] is List ? workspace[key] as List : [];
    return Scaffold(appBar: AppBar(title: Text(flightText(log['controlNo']).isEmpty ? 'Flight Log' : flightText(log['controlNo'])), actions: [
      IconButton(tooltip: 'Export flight record PDF', onPressed: loading ? null : exportPdf, icon: const Icon(Icons.picture_as_pdf_outlined)),
      IconButton(onPressed: load, icon: const Icon(Icons.refresh))]),
      body: loading ? const Center(child: CircularProgressIndicator()) : RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.all(12), children: [
        if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
        if (recovery.isNotEmpty && draft.isEmpty) Card(child: Padding(
          padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Unsaved flight draft', style: TextStyle(fontWeight: FontWeight.bold)),
            Text('Saved locally: ${flightText(recovery['savedAt'])}'),
            if (recovery['version'] != log['__v'])
              const Text('The server record changed. Review restored fields before saving.'),
            Row(children: [
              TextButton(onPressed: () => updateDraft(() {
                draft = flightMap(recovery['changes']); recovery = {}; restoreGeneration++;
              }), child: const Text('Restore draft')),
              TextButton(onPressed: discardStoredDraft, child: const Text('Discard draft')),
            ]),
          ]))),
        SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: [
          for (final option in const [
            ('flight', 'Flight Log'), ('preparation', 'Preparation Checks'),
            ('pre', 'Pre-Flight Inspection'), ('post', 'Post-Flight Inspection'),
            ('defects', 'Aircraft Defects'), ('history', 'History & Amendments'),
          ]) Padding(padding: const EdgeInsets.only(right: 6), child: ChoiceChip(
            label: Text(option.$2), selected: tab == option.$1,
            onSelected: (_) => setState(() => tab = option.$1))),
        ])),
        const SizedBox(height: 8),
        if (tab == 'flight') ...[
        SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: [
          for (final option in [
            ('basic', 'Basic Information'), ('destinations', 'Destination/s'),
            ('brought', 'Brought Forward'), ('this', 'This Flight'),
            ('toDate', 'To Date'), ('fuel', 'Fuel Servicing'),
            ('oil', 'Oil Servicing'), ('remarks', 'Discrepancy/Remarks'),
            ('work', 'Work Done'),
          ]) Padding(padding: const EdgeInsets.only(right: 6), child: ChoiceChip(
            label: Text(option.$2), selected: flightPane == option.$1,
            onSelected: (_) => setState(() => flightPane = option.$1))),
        ])),
        const SizedBox(height: 8),
        if (flightPane == 'basic') section('Flight record', [
          Text(flightStageLabel(flightStage(log)), style: const TextStyle(color: Color(0xff245e49), fontWeight: FontWeight.bold)),
          field(log, 'rpc', 'Aircraft'), field(log, 'aircraftType', 'Aircraft type'),
          field(log, 'controlNo', 'Control number', editable: preparation), field(log, 'date', 'Flight date', editable: preparation),
          if (preparation) DropdownButtonFormField<String>(
            key: ValueKey('purpose-$restoreGeneration'),
            initialValue: {'', 'company_transport', 'line_inspection', 'sling_work', 'training', 'maintenance_test', 'other'}.contains(flightText(draft['flightPurpose'] ?? log['flightPurpose'])) ? flightText(draft['flightPurpose'] ?? log['flightPurpose']) : '',
            decoration: const InputDecoration(labelText: 'Flight purpose', border: OutlineInputBorder()),
            items: const {'': 'Select purpose', 'company_transport': 'Company transport', 'line_inspection': 'Line inspection', 'sling_work': 'Sling work', 'training': 'Training', 'maintenance_test': 'Maintenance test', 'other': 'Other'}.entries.map((entry) => DropdownMenuItem(value: entry.key, child: Text(entry.value))).toList(),
            onChanged: (value) => updateDraft(() => draft['flightPurpose'] = value ?? ''),
          ) else field(log, 'flightPurpose', 'Purpose'),
          field(log, 'purposeDetails', 'Purpose details', editable: preparation),
          field(flightMap(log['assignedPilot']), 'name', 'Assigned pilot'), field(flightMap(log['assignedMechanic']), 'name', 'Assigned mechanic'),
          if (preparation && pilots.isNotEmpty) DropdownButtonFormField<String>(
            key: ValueKey('pilot-$restoreGeneration'),
            initialValue: pilots.any((item) => flightText(item['userId']) == flightText(flightMap(draft['assignedPilot'] ?? log['assignedPilot'])['userId'])) ? flightText(flightMap(draft['assignedPilot'] ?? log['assignedPilot'])['userId']) : null,
            decoration: const InputDecoration(labelText: 'Change assigned pilot', border: OutlineInputBorder()),
            items: pilots.map((item) => DropdownMenuItem(value: flightText(item['userId']), child: Text(flightText(item['name'])))).toList(),
            onChanged: (value) => updateDraft(() => draft['assignedPilot'] = value == null ? null : {'userId': value}),
          ),
        ]),
        if (canEdit) FilledButton.icon(onPressed: saving || draft.isEmpty ? null : save, icon: const Icon(Icons.save_outlined), label: Text(saving ? 'Saving…' : 'Save draft')),
        if (preparation) FilledButton.icon(onPressed: saving ? null : release, icon: const Icon(Icons.send_outlined), label: const Text('Sign and release to pilot')),
        if (pilotAssigned && stage == 'pending_acceptance') FilledButton.icon(onPressed: saving ? null : accept, icon: const Icon(Icons.draw), label: const Text('Sign and accept aircraft')),
        if (canReturn) OutlinedButton.icon(onPressed: saving ? null : returnForCorrection,
          icon: const Icon(Icons.undo), label: const Text('Return for correction')),
        if (flightPane == 'destinations')
          section('Flight legs', [
            for (var index = 0; index < currentLegs(log).length; index++) ExpansionTile(title: Text('Leg ${index + 1}'), children: [
              for (var stationIndex = 0; stationIndex < (currentLegs(log)[index]['stations'] as List? ?? [<String, dynamic>{'from': '', 'to': ''}]).length; stationIndex++)
                Card(child: Padding(padding: const EdgeInsets.all(8), child: Column(children: [
                  Row(children: [Expanded(child: Text('Station ${stationIndex + 1}', style: const TextStyle(fontWeight: FontWeight.bold))),
                    if (canEdit && (currentLegs(log)[index]['stations'] as List? ?? []).length > 1)
                      IconButton(tooltip: 'Remove station', onPressed: () => removeStation(log, index, stationIndex), icon: const Icon(Icons.delete_outline))]),
                  legField(log, index, 'from', 'From', stationIndex: stationIndex, editable: canEdit),
                  legField(log, index, 'to', 'To', stationIndex: stationIndex, editable: canEdit),
                ]))),
              if (canEdit) TextButton.icon(onPressed: () => addStation(log, index), icon: const Icon(Icons.add), label: const Text('Add station')),
              legField(log, index, 'date', 'Date', editable: canEdit), legField(log, index, 'blockTimeOff', 'Block off', editable: canEdit),
              legField(log, index, 'blockTimeOn', 'Block on', editable: canEdit), legField(log, index, 'flightTimeOff', 'Flight off', editable: canEdit),
              legField(log, index, 'flightTimeOn', 'Flight on', editable: canEdit),
              legField(log, index, 'totalTimeOn', 'Total block time (HH:mm)', editable: canEdit),
              legField(log, index, 'totalTimeOff', 'Total flight time (HH:mm)', editable: canEdit),
              legField(log, index, 'passengers', 'Passengers', editable: canEdit),
              if (canEdit && currentLegs(log).length > 1) TextButton.icon(onPressed: () { final legs = currentLegs(log); legs.removeAt(index); updateDraft(() => draft['legs'] = legs); }, icon: const Icon(Icons.delete_outline), label: const Text('Remove leg')),
            ]),
              if (canEdit) TextButton.icon(onPressed: () { final legs = currentLegs(log); legs.add({'stations': [{'from': '', 'to': ''}], 'date': '', 'blockTimeOff': '', 'blockTimeOn': '', 'flightTimeOff': '', 'flightTimeOn': '', 'totalTimeOn': '', 'totalTimeOff': '', 'passengers': '0'}); updateDraft(() => draft['legs'] = legs); }, icon: const Icon(Icons.add), label: const Text('Add leg')),
          ]),
        if (flightPane == 'fuel' && !flightText(log['aircraftType']).toUpperCase().contains('412')) section('Fuel servicing', [
            for (var index = 0; index < currentLegs(log).length; index++) ExpansionTile(title: Text('Leg ${index + 1}'), children: [
              servicingField(log, 'fuelServicing', index, 'date', 'Date', canEdit),
              servicingField(log, 'fuelServicing', index, 'contCheck', 'Contamination check', canEdit),
              servicingField(log, 'fuelServicing', index, 'mainRemG', 'Main remaining gallons', canEdit),
              servicingField(log, 'fuelServicing', index, 'mainAdd', 'Main added gallons', canEdit),
              servicingField(log, 'fuelServicing', index, 'mainTotal', 'Main total gallons', canEdit),
              if (canEdit) DropdownButtonFormField<String>(
                initialValue: ['drum', 'truck'].contains(index < servicingRows(log, 'fuelServicing').length ?
                  servicingRows(log, 'fuelServicing')[index]['fuelType'] : null) ?
                  flightText(servicingRows(log, 'fuelServicing')[index]['fuelType']) : null,
                decoration: const InputDecoration(labelText: 'Fuel source'),
                items: const [DropdownMenuItem(value: 'drum', child: Text('Drum')),
                  DropdownMenuItem(value: 'truck', child: Text('Truck'))],
                onChanged: (value) => changeServicing(log, 'fuelServicing', index, 'fuelType', value ?? ''),
              ),
              if (!canEdit) servicingField(log, 'fuelServicing', index, 'fuelType', 'Fuel source', false),
              servicingSignature(log, 'fuelServicing', index, canEdit),
            ]),
          ]),
        if (flightPane == 'oil' && !flightText(log['aircraftType']).toUpperCase().contains('412')) section('Oil servicing', [
            for (var index = 0; index < currentLegs(log).length; index++) ExpansionTile(title: Text('Leg ${index + 1}'), children: [
              servicingField(log, 'oilServicing', index, 'date', 'Date', canEdit),
              for (final entry in const {'engineRem': 'Engine remaining', 'engineAdd': 'Engine added', 'engineTot': 'Engine total',
                'mrGboxRem': 'Main rotor gearbox remaining', 'mrGboxAdd': 'Main rotor gearbox added', 'mrGboxTot': 'Main rotor gearbox total',
                'trGboxRem': 'Tail rotor gearbox remaining', 'trGboxAdd': 'Tail rotor gearbox added', 'trGboxTot': 'Tail rotor gearbox total',
                'remarks': 'Remarks'}.entries)
                servicingField(log, 'oilServicing', index, entry.key, entry.value, canEdit),
              servicingSignature(log, 'oilServicing', index, canEdit),
            ]),
          ]),
        if (canEdit && flightDetails) FilledButton.icon(onPressed: saving ? null : complete, icon: const Icon(Icons.fact_check_outlined), label: const Text('Review and close flight record')),
        if (flightPane == 'remarks') section('Discrepancy/Remarks', [
          field(log, 'remarks', 'Remarks', editable: canEdit, lines: 3),
          field(log, 'sling', 'Sling work details', editable: canEdit),
          field(log, 'additionalLandings', 'Additional landings', editable: canEdit),
          SwitchListTile(title: const Text('No defects reported'),
            value: draft['noDefectsReported'] ?? log['noDefectsReported'] == true,
            onChanged: canEdit ? (value) => updateDraft(() => draft['noDefectsReported'] = value) : null),
          if (flightText(log['aircraftType']).toUpperCase().contains('412'))
            b412Field(log, ['discrepancyRemarks'], 'Bell 412 discrepancy remarks', canEdit),
        ]),
        if (!flightText(log['aircraftType']).toUpperCase().contains('412') &&
            {'brought', 'this', 'toDate'}.contains(flightPane)) section('AS350 component times', [
          for (final (title, period) in [('Brought forward', 'broughtForwardData'),
            ('This flight', 'thisFlightData'), ('To date', 'toDateData')])
            if (flightPane == (period == 'broughtForwardData' ? 'brought' :
                period == 'thisFlightData' ? 'this' : 'toDate'))
            ExpansionTile(title: Text(title), children: [
              for (final (key, label) in const [('airframe', 'Airframe'), ('gearBoxMain', 'Main gearbox'),
                ('gearBoxTail', 'Tail gearbox'), ('rotorMain', 'Main rotor'), ('rotorTail', 'Tail rotor'),
                ('airframeNextInsp', 'Aircraft inspection next due'), ('engine', 'Engine'),
                ('cycleN1', 'N1 cycles'), ('cycleN2', 'N2 cycles'), ('usage', 'Usage'),
                ('landingCycle', 'Landing cycles'), ('engineNextInsp', 'Engine inspection next due')])
                componentField(log, period, key, label, preparation && period == 'broughtForwardData'),
            ]),
        ]),
        if (flightPane == 'work') section('Maintenance work', [
          for (var index = 0; index < workRows(log).length; index++) ExpansionTile(
            title: Text('Work item ${index + 1}'), children: [
              workField(log, index, 'date', 'Date', canEdit && (workRows(log)[index]['phase'] ?? 'preparation') == (preparation ? 'preparation' : 'post_flight')),
              workField(log, index, 'aircraft', 'Aircraft', canEdit && (workRows(log)[index]['phase'] ?? 'preparation') == (preparation ? 'preparation' : 'post_flight')),
              workField(log, index, 'workDone', 'Work done', canEdit && (workRows(log)[index]['phase'] ?? 'preparation') == (preparation ? 'preparation' : 'post_flight'), lines: 3),
              workField(log, index, 'name', 'Name', canEdit && (workRows(log)[index]['phase'] ?? 'preparation') == (preparation ? 'preparation' : 'post_flight')),
              workField(log, index, 'certificateNumber', 'Certificate number', canEdit && (workRows(log)[index]['phase'] ?? 'preparation') == (preparation ? 'preparation' : 'post_flight')),
              if (canEdit && (workRows(log)[index]['phase'] ?? 'preparation') == (preparation ? 'preparation' : 'post_flight')) ...[
                Wrap(spacing: 6, children: const ['Discrepancy Correction', 'SB/AD Compliance', 'Inspection', 'Others'].map((type) {
                  final selected = (workRows(log)[index]['selectedWorkTypes'] as List? ?? []).map((item) => '$item').toList();
                  return FilterChip(label: Text(type), selected: selected.contains(type), onSelected: (checked) {
                    if (checked) { selected.add(type); } else { selected.remove(type); }
                    changeWork(log, index, 'selectedWorkTypes', selected);
                  });
                }).toList()),
                TextButton.icon(onPressed: () async {
                  final signature = await collectFlightSignature(context, widget.session,
                    existing: flightText(workRows(log)[index]['signature']).isEmpty ? null : flightText(workRows(log)[index]['signature']));
                  if (signature != null && mounted) changeWork(log, index, 'signature', signature.image);
                }, icon: const Icon(Icons.draw_outlined), label: const Text('Sign work item')),
                TextButton.icon(onPressed: () { final rows = workRows(log); rows.removeAt(index); updateDraft(() => draft['workItems'] = rows); },
                  icon: const Icon(Icons.delete_outline), label: const Text('Remove work item')),
              ],
            ]),
          if (canEdit) TextButton.icon(onPressed: () { final rows = workRows(log); rows.add({
            'id': DateTime.now().microsecondsSinceEpoch.toString(), 'phase': preparation ? 'preparation' : 'post_flight',
            'selectedWorkTypes': <String>[], 'date': '', 'aircraft': flightText(log['rpc']), 'workDone': '',
            'name': '', 'certificateNumber': '', 'signature': '',
          }); updateDraft(() => draft['workItems'] = rows); }, icon: const Icon(Icons.add), label: const Text('Add work item')),
        ]),
        if (flightText(log['aircraftType']).toUpperCase().contains('412') &&
            {'basic', 'brought', 'this', 'toDate', 'fuel', 'oil'}.contains(flightPane))
          section('Bell 412 flight form', [
          if (flightPane == 'basic') ExpansionTile(title: const Text('Basic information and passengers'), children: [
            b412Field(log, ['serialNumber'], 'Serial number', preparation),
            for (var row = 0; row < 4; row++) ExpansionTile(title: Text('Passenger row ${row + 1}'), children: [
              for (var leg = 0; leg < 6; leg++)
                b412Field(log, ['passengerRows', row, 'legs', leg], 'Leg ${leg + 1}', canEdit),
            ]),
          ]),
          for (final (label, key) in [('Brought forward', 'broughtForwardData'),
            ('This flight', 'thisFlightData'), ('To date', 'toDateData')])
            if (flightPane == (key == 'broughtForwardData' ? 'brought' :
                key == 'thisFlightData' ? 'this' : 'toDate'))
            ExpansionTile(title: Text(label), children: [
              b412Field(log, ['componentData', key, 'airframe'], 'Airframe', canEdit && (key != 'broughtForwardData' || preparation)),
              b412Field(log, ['componentData', key, 'landingCycle'], 'Landing cycle', canEdit && (key != 'broughtForwardData' || preparation)),
              for (final component in const ['mrGearbox', 'tr90Gearbox', 'tr42Gearbox', 'engine1', 'engine2'])
                for (final metric in (component.startsWith('engine') ? ['tsn', 'tso', 'cycle'] : ['tsn', 'tso']))
                  b412Field(log, ['componentData', key, component, metric], '$component $metric', canEdit && (key != 'broughtForwardData' || preparation)),
              b412Field(log, ['componentData', key, 'sling'], 'Sling', canEdit),
              b412Field(log, ['componentData', key, 'others'], 'Others', canEdit),
            ]),
          if (flightPane == 'toDate') ExpansionTile(title: const Text('Inspection due limits'), children: [
            b412Field(log, ['componentData', 'airframeNextInspectionDueAt'], 'Airframe next inspection due at', canEdit),
            b412Field(log, ['componentData', 'engineNextInspectionDueAt'], 'Engine next inspection due at', canEdit),
          ]),
          if (flightPane == 'fuel') ExpansionTile(title: const Text('Fuel servicing'), children: [
            for (var row = 0; row < 6; row++) ExpansionTile(title: Text('Leg ${row + 1}'), children: [
              for (final (key, label) in const [('contCheck', 'Contamination check'), ('mainTankRemaining', 'Main tank remaining'),
                ('mainTankAdded', 'Main tank added'), ('mainTankTotal', 'Main tank total'),
                ('supplySystem1', 'Supply system 1'), ('supplySystem2', 'Supply system 2'),
                ('refuelerName', 'Refueller name'), ('remarks', 'Remarks')])
                b412Field(log, ['fuelServicing', row, key], label, preparation),
              b412Signature(log, ['fuelServicing', row, 'signature'], 'Refueller signature', preparation),
            ]),
          ]),
          if (flightPane == 'oil') ExpansionTile(title: const Text('Oil servicing'), children: [
            for (var row = 0; row < 2; row++) ExpansionTile(title: Text('Service row ${row + 1}'), children: [
              for (final component in const ['engine1', 'engine2', 'mrGearbox', 'reductionGearbox', 'tr42Gearbox', 'tr90Gearbox'])
                for (final metric in const ['remaining', 'added', 'total'])
                  b412Field(log, ['oilServicing', row, component, metric], '$component $metric', preparation),
              b412Signature(log, ['oilServicing', row, 'mechanicSignature'], 'Mechanic signature', preparation),
            ]),
          ]),
        ]),
        ],
        if (tab == 'preparation') section('Readiness', [
          ...((flightMap(workspace['readiness'])['missing'] as List?) ?? []).map((item) => ListTile(leading: const Icon(Icons.error_outline, color: Colors.red), title: Text('$item'))),
          ...((flightMap(workspace['readiness'])['warnings'] as List?) ?? []).map((item) => ListTile(leading: const Icon(Icons.warning_amber), title: Text('$item'))),
          if ((flightMap(workspace['readiness'])['maintenanceDue'] as List? ?? []).isNotEmpty)
            ExpansionTile(title: Text('${(flightMap(workspace['readiness'])['maintenanceDue'] as List).length} maintenance warnings — release is allowed'),
              children: [for (final item in flightMap(workspace['readiness'])['maintenanceDue'] as List)
                ListTile(leading: const Icon(Icons.schedule, color: Colors.orange), title: Text('$item'))]),
          ListTile(title: const Text('Aircraft status'), subtitle: Text(flightText(flightMap(workspace['readiness'])['aircraftStatus']))),
        ]),
        if ((tab == 'pre' || tab == 'post') && assigned && preparation &&
            entries('preInspections').isEmpty && entries('postInspections').isEmpty)
          FilledButton.icon(onPressed: saving ? null : addInspectionPair,
            icon: const Icon(Icons.add_task), label: const Text('Add Linked Inspection Pair')),
        if (tab == 'history') OutlinedButton.icon(onPressed: shareHistory, icon: const Icon(Icons.share_outlined),
          label: const Text('Share Record & Audit History')),
        for (final pair in [('preInspections', 'Pre-Flight Inspections'), ('postInspections', 'Post-Flight Inspections'), ('defects', 'Defects'), ('amendments', 'Amendments'), ('history', 'History')])
          if ((tab == 'pre' && pair.$1 == 'preInspections') ||
              (tab == 'post' && pair.$1 == 'postInspections') ||
              (tab == 'defects' && pair.$1 == 'defects') ||
              (tab == 'history' && ['amendments', 'history'].contains(pair.$1)))
            section(pair.$2, entries(pair.$1).isEmpty ? [const Text('No records')] : entries(pair.$1).map((item) {
            final row = flightMap(item);
            return ListTile(title: Text(flightText(row['title'] ?? row['description'] ?? row['controlNo'] ?? row['status'] ?? row['action'])),
              subtitle: Text([row['date'], row['status'], row['comment'], row['createdAt']].where((value) => value != null && '$value'.isNotEmpty).join(' · ')),
              onTap: pair.$1 == 'preInspections' || pair.$1 == 'postInspections' ? () async {
                await Navigator.push(context, MaterialPageRoute(builder: (_) => LinkedInspectionPage(session: widget.session,
                  flightId: widget.id, record: row, kind: pair.$1 == 'preInspections' ? 'pre' : 'post',
                  editable: assigned && (pair.$1 == 'preInspections' ? preparation : flightDetails))));
                load();
              } : pair.$1 == 'defects' && assigned && stage != 'completed' ? () => editDefect(row) : null);
          }).toList()),
        if (tab == 'defects' && assigned && stage != 'completed') FilledButton.icon(onPressed: saving ? null : () => editDefect(), icon: const Icon(Icons.report_problem_outlined), label: const Text('Report aircraft defect')),
        if (tab == 'history' && assigned && stage == 'completed') OutlinedButton.icon(onPressed: saving ? null : amend,
          icon: const Icon(Icons.edit_note), label: const Text('Add signed amendment')),
      ])));
  }
}
