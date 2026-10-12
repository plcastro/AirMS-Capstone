import 'dart:async';
import 'package:flutter/material.dart';
import 'search.dart';
import 'toast.dart';
import 'auth.dart';
import 'pdf_exports.dart';
import 'date_time.dart';

const requisitionStatusColors = <String, Color>{
  'Pending Check': Color(0xff8c8c8c), 'Requested': Color(0xff8c8c8c),
  'In Stock': Color(0xff389e0d), 'Out of Stock': Color(0xffd46b08),
  'Awaiting Stock': Color(0xffd46b08), 'Ready for Delivery': Color(0xff1677ff),
  'Delivered': Color(0xffad8b00), 'Closed': Color(0xff389e0d),
  'Cancelled': Color(0xffa85d5d),
};

String normalizeItemStatus(dynamic status) {
  if (['Pending Check', 'In Stock', 'Out of Stock'].contains(status)) return '$status';
  if (['Ordered', 'Approved', 'Delivered'].contains(status)) return 'In Stock';
  if (status == 'To Be Ordered') return 'Out of Stock';
  return 'Pending Check';
}

String itemDisplayStatus(Map record, Map item) {
  final stock = normalizeItemStatus(item['stockStatus']);
  final requisition = requisitionStatus(record);
  return stock == 'In Stock' && ['Delivered', 'Closed'].contains(requisition)
    ? requisition : stock;
}

List<Map<String, dynamic>> requisitionTimeline(Map record) {
  final staff = record['staff'] is Map ? record['staff'] as Map : <String, dynamic>{};
  final legacy = <Map<String, dynamic>>[
    {'label': 'Requested', 'at': record['dateRequested'] ?? record['createdAt'], 'actorName': staff['requisitioner']},
    {'label': 'Stock checked', 'at': record['dateWarehouseReviewed'], 'actorName': staff['warehouseBy']},
    {'label': 'Ordered (legacy)', 'at': record['dateOrdered'], 'actorName': staff['warehouseBy']},
    {'label': 'Approved (legacy)', 'at': record['dateApproved'], 'actorName': staff['approvedBy']},
    {'label': 'Delivered', 'at': record['deliveredAt'] ?? record['dateDelivered'], 'actorName': staff['deliveredBy']},
    {'label': 'Receipt confirmed', 'at': record['confirmedAt'] ?? record['dateReceived'], 'actorName': staff['receiver']},
    {'label': 'Cancelled', 'at': record['cancelledAt'] ?? record['dateCancelled']},
  ].where((event) => event['at'] != null && '${event['at']}'.isNotEmpty).toList();
  final history = (record['history'] as List? ?? []).whereType<Map>()
    .map((event) => Map<String, dynamic>.from(event)).toList();
  return [...legacy.where((event) => !history.any((item) => item['label'] == event['label'])), ...history]
    ..sort((a, b) => (DateTime.tryParse('${a['at']}') ?? DateTime(1970))
      .compareTo(DateTime.tryParse('${b['at']}') ?? DateTime(1970)));
}

String requisitionStatus(Map record) {
  final status = '${record['status'] ?? ''}';
  if (['Requested', 'Awaiting Stock', 'Ready for Delivery', 'Delivered', 'Closed', 'Cancelled'].contains(status)) return status;
  if (status == 'Availability Checked') {
    final items = (record['items'] as List? ?? []).whereType<Map>().toList();
    if (items.isEmpty || items.any((item) => normalizeItemStatus(item['stockStatus']) == 'Pending Check')) return 'Requested';
    return items.any((item) => normalizeItemStatus(item['stockStatus']) == 'Out of Stock')
      ? 'Awaiting Stock' : 'Ready for Delivery';
  }
  return switch (status) {
    'Completed' => 'Closed', 'Rejected' => 'Cancelled', 'Approved' || 'Ordered' => 'Ready for Delivery',
    'To Be Ordered' || 'In Progress' => 'Awaiting Stock', _ => 'Requested',
  };
}
String requisitionLabel(String status) => switch (status) {
  'Out of Stock' => 'Restocking', 'Requested' => 'Pending Stock Check',
  'Awaiting Stock' => 'Awaiting Restock', 'Ready for Delivery' => 'Stock Confirmed',
  'Delivered' => 'Ready for Pickup', 'Closed' => 'Received', _ => status,
};
String requisitionRole(Map? user) => '${user?['jobTitle'] ?? user?['access'] ?? ''}'.toLowerCase();
String requisitionUserId(Map? user) => '${user?['_id'] ?? user?['id'] ?? user?['userId'] ?? ''}';
bool ownsRequisition(Map? user, Map record) {
  final ownerId = '${(record['staff'] as Map?)?['requisitionerId'] ?? ''}';
  return ownerId.isNotEmpty && ownerId == requisitionUserId(user);
}
DateTime requisitionDate(Map record) {
  final value = '${record['dateRequested'] ?? record['createdAt'] ?? record['updatedAt'] ?? ''}';
  final iso = DateTime.tryParse(value);
  if (iso != null) return iso;
  final match = RegExp(r'^(\d{1,2})/(\d{1,2})/(\d{4})$').firstMatch(value);
  if (match != null) return DateTime(int.parse(match[3]!), int.parse(match[1]!), int.parse(match[2]!));
  return DateTime(1970);
}

class RequisitionsPage extends StatefulWidget {
  const RequisitionsPage({super.key, required this.session});
  final AirmsSession session;
  @override State<RequisitionsPage> createState() => _RequisitionsPageState();
}
class _RequisitionsPageState extends State<RequisitionsPage> {
  List<Map<String, dynamic>> records = [];
  String tab = 'active', search = '', error = '', sortOrder = 'oldest';
  bool loading = true;
  bool exporting = false;
  Timer? refreshTimer;
  String get role => requisitionRole(widget.session.user);
  bool get oversight => ['officer-in-charge', 'admin staff'].contains(role);
  @override void initState() {
    super.initState(); load();
    refreshTimer = Timer.periodic(const Duration(seconds: 15), (_) { if (mounted && !loading) load(silent: true); });
  }
  @override void dispose() { refreshTimer?.cancel(); super.dispose(); }
  Future<void> load({bool silent = false}) async {
    if (!silent) setState(() => loading = true);
    try {
      final data = await widget.session.request('/api/parts-requisition/get-all-requisition');
      final list = data is List ? data : data['data'] as List? ?? [];
      if (mounted) setState(() { records = list.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList(); error = ''; });
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted && !silent) setState(() => loading = false); }
  }
  bool canSee(Map record) => oversight || role == 'warehouse personnel' || ownsRequisition(widget.session.user, record);
  Future<void> exportReport(List<Map<String, dynamic>> records) async {
    setState(() { exporting = true; error = ''; });
    try {
      final totalItems = records.fold<int>(0, (sum, record) => sum + (record['items'] as List? ?? []).length);
      final totalQuantity = records.fold<num>(0, (sum, record) => sum + (record['items'] as List? ?? []).whereType<Map>()
        .fold<num>(0, (count, item) => count + (num.tryParse('${item['quantity'] ?? 0}') ?? 0)));
      await shareAirmsPdf(title: 'Parts Requisition Monitoring Report',
        fileName: 'Parts-Requisition-Monitoring-Report-${DateTime.now().toIso8601String().split('T').first}.pdf',
        subtitle: '${tab == 'history' ? 'History' : 'Pending'} · ${records.length} requisitions · $totalItems items · $totalQuantity total quantity',
        columns: const ['WRS No.', 'Aircraft', 'Requester', 'Date Requested', 'Status', 'Items', 'Total Qty'],
        rows: records.map((record) {
          final items = record['items'] as List? ?? [];
          final quantity = items.whereType<Map>().fold<num>(0, (sum, item) => sum + (num.tryParse('${item['quantity'] ?? 0}') ?? 0));
          return [
            '${record['wrsNo'] ?? 'N/A'}', '${record['aircraft'] ?? 'N/A'}',
            '${(record['staff'] as Map?)?['requisitioner'] ?? 'N/A'}',
            '${record['dateRequested'] ?? record['createdAt'] ?? 'N/A'}',
            requisitionLabel(requisitionStatus(record)), '${items.length}', '$quantity',
          ];
        }).toList());
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => exporting = false); }
  }
  @override Widget build(BuildContext context) {
    final pendingCount = records.where((record) => canSee(record) &&
      !['Closed', 'Cancelled'].contains(requisitionStatus(record))).length;
    final filtered = records.where((record) {
      final closed = ['Closed', 'Cancelled'].contains(requisitionStatus(record));
      return canSee(record) && (tab == 'history' ? closed : !closed) && matchesSearch(search, record);
    }).toList()..sort((a, b) {
      final order = requisitionDate(a).compareTo(requisitionDate(b));
      return sortOrder == 'oldest' ? order : -order;
    });
    return Stack(children: [RefreshIndicator(onRefresh: () => load(), child: ListView(padding: const EdgeInsets.fromLTRB(16, 12, 16, 90), children: [
      TextField(decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search requisitions', border: OutlineInputBorder()),
        onChanged: (value) => setState(() => search = value)),
      const SizedBox(height: 8),
      SegmentedButton<String>(segments: [ButtonSegment(value: 'active', label: Text('Pending ($pendingCount)')),
        const ButtonSegment(value: 'history', label: Text('History'))], selected: {tab},
        onSelectionChanged: (value) => setState(() => tab = value.first)),
      DropdownButtonFormField<String>(initialValue: sortOrder,
        decoration: const InputDecoration(labelText: 'Sort requisitions', border: OutlineInputBorder()),
        items: const [DropdownMenuItem(value: 'oldest', child: Text('Date: Oldest First')),
          DropdownMenuItem(value: 'newest', child: Text('Date: Newest First'))],
        onChanged: (value) => setState(() => sortOrder = value ?? 'oldest')),
      if (role == 'warehouse personnel') OutlinedButton.icon(
        onPressed: exporting || filtered.isEmpty ? null : () => exportReport(filtered),
        icon: const Icon(Icons.picture_as_pdf_outlined), label: Text(exporting ? 'Exporting...' : 'Export report PDF')),
      if (loading) const LinearProgressIndicator(),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      if (!loading && filtered.isEmpty) const Padding(padding: EdgeInsets.all(30), child: Center(child: Text('No requisitions found'))),
      for (final record in filtered) Card(child: InkWell(onTap: () async { final changed = await Navigator.push<bool>(context, MaterialPageRoute(builder: (_) => RequisitionDetailPage(
          session: widget.session, record: record)));
          if (changed == true) load(); }, child: Padding(padding: const EdgeInsets.all(12), child: Column(
          crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [Expanded(child: Text('${record['wrsNo'] ?? 'Warehouse Slip'}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
              Chip(label: Text(requisitionLabel(requisitionStatus(record))),
                backgroundColor: (requisitionStatusColors[requisitionStatus(record)] ?? Colors.grey).withValues(alpha: .14))]),
            Text('Slip No: ${record['wrsNo'] ?? 'N/A'} · ${record['aircraft'] ?? 'N/A'}'),
            Text('Date: ${formatAirmsDateTime(record['dateRequested'] ?? record['createdAt'], fallback: 'N/A')}'),
            Text('Items: ${(record['items'] as List? ?? []).length}'),
            Text('Purpose: ${(record['items'] as List? ?? []).whereType<Map>().map((item) => '${item['purpose'] ?? ''}').where((value) => value.isNotEmpty).join(', ')}'),
            if (oversight && ['Requested', 'Awaiting Stock', 'Delivered'].contains(requisitionStatus(record)))
              Align(alignment: Alignment.centerRight, child: TextButton(onPressed: () async {
                final changed = await Navigator.push<bool>(context, MaterialPageRoute(builder: (_) => RequisitionDetailPage(
                  session: widget.session, record: record)));
                if (changed == true) load();
              }, child: const Text('Follow Up'))),
          ])))),
    ])),
      if (['mechanic', 'maintenance manager'].contains(role)) Positioned(right: 16, bottom: 16,
        child: FloatingActionButton.extended(onPressed: () async {
          final changed = await Navigator.push<bool>(context, MaterialPageRoute(builder: (_) => RequisitionFormPage(session: widget.session)));
          if (changed == true) load();
        }, icon: const Icon(Icons.add), label: const Text('New Requisition'))),
    ]);
  }
}

class RequisitionDetailPage extends StatefulWidget {
  const RequisitionDetailPage({super.key, required this.session, required this.record});
  final AirmsSession session;
  final Map<String, dynamic> record;
  @override State<RequisitionDetailPage> createState() => _RequisitionDetailPageState();
}
class _RequisitionDetailPageState extends State<RequisitionDetailPage> {
  late Map<String, dynamic> record;
  Map<String, String> stockDraft = {};
  bool busy = false;
  String error = '';
  String get role => requisitionRole(widget.session.user);
  String get status => requisitionStatus(record);
  bool get open => !['Delivered', 'Closed', 'Cancelled'].contains(status);
  bool get owner => ownsRequisition(widget.session.user, record);
  bool get oversight => ['admin staff', 'officer-in-charge'].contains(role);
  List<Map> get items => (record['items'] as List? ?? []).whereType<Map>().toList();
  bool get allInStock => items.isNotEmpty && items.every((item) => (stockDraft['${item['_id']}'] ?? item['stockStatus']) == 'In Stock');
  @override void initState() { super.initState(); record = widget.record; }
  Future<void> act(String action, [Map<String, dynamic> extra = const {}]) async {
    if (action != 'stock') {
      final approved = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
        title: Text(action == 'confirm' ? 'Confirm receipt' : action == 'deliver' ? 'Mark ready for pickup' : action == 'cancel' ? 'Cancel requisition' : 'Send follow-up'),
        content: Text(switch (action) {
          'confirm' => 'Confirm you received all requested parts. This closes the requisition.',
          'follow-up' => 'Send follow-up reminder',
          'deliver' => 'Mark these parts ready for pickup?',
          'cancel' => 'Cancel this requisition?',
          _ => 'Continue for ${record['wrsNo']}?',
        }), actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Confirm')),
        ]));
      if (approved != true) return;
    }
    setState(() { busy = true; error = ''; });
    try {
      final data = await widget.session.request('/api/parts-requisition/update-requisition/${record['_id']}',
        method: 'POST', body: {'action': action, ...extra, 'confirmAction': true},
        extraHeaders: {'x-action-confirmed': 'true'});
      if (mounted) setState(() { record = Map<String, dynamic>.from(data as Map); stockDraft = {}; });
      if (mounted) { AirmsToast.show(switch (action) {
        'stock' => 'Stock check saved.', 'deliver' => 'Ready for pickup.',
        'confirm' => 'Receipt confirmed.', 'cancel' => 'Requisition cancelled.',
        'follow-up' => 'Follow-up reminder sent.', _ => 'Requisition updated.',
      }); }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  List<Map<String, String>> stockUpdates() => stockDraft.entries.map((entry) => {'itemId': entry.key, 'stockStatus': entry.value}).toList();
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: Text('${record['wrsNo'] ?? 'Requisition'}')),
    body: ListView(padding: const EdgeInsets.all(16), children: [
      Text('${record['aircraft'] ?? ''} · ${(record['staff'] as Map?)?['requisitioner'] ?? ''}',
        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
      Chip(label: Text(requisitionLabel(status))),
      if (status == 'Delivered') const Card(child: Padding(padding: EdgeInsets.all(12),
        child: Text('Ready for pickup. Awaiting requester confirmation of receipt.'))),
      const SizedBox(height: 12), const Text('Items', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
      for (final item in items) Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(
        crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('${item['particular'] ?? 'Part'}', style: const TextStyle(fontWeight: FontWeight.bold)),
        Text('${item['quantity'] ?? ''} ${item['unitOfMeasure'] ?? ''} · ${item['purpose'] ?? ''}'),
        Text(requisitionLabel(stockDraft['${item['_id']}'] ?? itemDisplayStatus(record, item))),
        if (role == 'warehouse personnel' && open) Wrap(children: [for (final option in ['In Stock', 'Out of Stock'])
          ChoiceChip(label: Text(option),
            selected: (stockDraft['${item['_id']}'] ?? item['stockStatus']) == option,
            onSelected: (_) => setState(() => stockDraft['${item['_id']}'] = option))]),
      ]))),
      const SizedBox(height: 12), const Text('History', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
      for (final event in requisitionTimeline(record))
        ListTile(title: Text(event['label'] == 'Delivered' ? 'Ready for pickup' : '${event['label'] ?? ''}'),
          subtitle: Text('${formatAirmsDateTime(event['at'], fallback: 'N/A')} · ${event['actorName'] ?? 'N/A'}${event['details'] == null || '${event['details']}'.isEmpty ? '' : '\n${event['details']}'}')),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      if (busy) const LinearProgressIndicator(),
      const SizedBox(height: 16),
      if (role == 'warehouse personnel' && open) ...[
        if (stockDraft.isNotEmpty) OutlinedButton(onPressed: busy ? null : () => act('stock', {'stockUpdates': stockUpdates()}),
          child: const Text('Save Stock Check')),
        if (allInStock) FilledButton(onPressed: busy ? null : () => act('deliver', {'stockUpdates': stockUpdates()}),
          child: const Text('Mark Ready for Pickup')),
      ],
      if ((owner || role == 'admin staff') && status == 'Delivered')
        FilledButton(onPressed: busy ? null : () => act('confirm'), child: const Text('Confirm Receipt')),
      if (owner && ['mechanic', 'maintenance manager'].contains(role) && open)
        OutlinedButton(onPressed: busy ? null : () => act('cancel'), child: const Text('Cancel Requisition')),
      if (oversight && ['Requested', 'Awaiting Stock', 'Delivered'].contains(status))
        OutlinedButton(onPressed: busy ? null : () => act('follow-up'), child: const Text('Follow Up')),
    ]));
}

class RequisitionFormPage extends StatefulWidget {
  const RequisitionFormPage({super.key, required this.session});
  final AirmsSession session;
  @override State<RequisitionFormPage> createState() => _RequisitionFormPageState();
}
class _RequisitionFormPageState extends State<RequisitionFormPage> {
  String? aircraft;
  List<String> aircraftOptions = [];
  List<_PartDraft> parts = [_PartDraft()];
  bool busy = false;
  String error = '';
  @override void initState() { super.initState(); loadAircraft(); }
  @override void dispose() { for (final part in parts) { part.dispose(); } super.dispose(); }
  Future<void> loadAircraft() async {
    try {
      final data = await widget.session.request('/api/parts-monitoring/aircraft-list');
      if (mounted) setState(() => aircraftOptions = (data['data'] as List? ?? []).map((item) => '$item').toList());
    } catch (_) {}
  }
  Future<void> submit() async {
    if (aircraft == null || parts.isEmpty || parts.any((part) => part.name.text.trim().isEmpty ||
        (int.tryParse(part.quantity.text) ?? 0) <= 0)) {
      setState(() => error = 'Choose an aircraft and enter each part with a positive quantity.'); return;
    }
    final confirmed = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: const Text('Submit requisition'), content: const Text('Send these parts to the warehouse for a stock check?'),
      actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Submit'))]));
    if (confirmed != true) return;
    setState(() { busy = true; error = ''; });
    try {
      await widget.session.request('/api/parts-requisition/create-requisition', method: 'POST',
        extraHeaders: {'x-action-confirmed': 'true'}, body: {
          'aircraft': aircraft,
          'items': parts.map((part) => {'particular': part.name.text.trim(),
            'quantity': int.parse(part.quantity.text), 'unitOfMeasure': part.unit,
            'purpose': part.purpose.text.trim()}).toList(),
          'confirmAction': true,
        });
      if (mounted) Navigator.pop(context, true);
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('New parts requisition')),
    body: ListView(padding: const EdgeInsets.all(16), children: [
      DropdownButtonFormField<String>(initialValue: aircraft, decoration: const InputDecoration(labelText: 'Aircraft *', border: OutlineInputBorder()),
        items: aircraftOptions.map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(),
        onChanged: (value) => setState(() => aircraft = value)),
      const SizedBox(height: 16),
      for (var index = 0; index < parts.length; index++) Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(children: [
        Row(children: [Expanded(child: Text('Item ${index + 1}', style: const TextStyle(fontWeight: FontWeight.bold))),
          if (parts.length > 1) IconButton(icon: const Icon(Icons.delete_outline), onPressed: () {
            final removed = parts.removeAt(index); setState(() {}); removed.dispose();
          })]),
        _PartNameField(key: ObjectKey(parts[index]), session: widget.session, part: parts[index], onUnitChanged: () => setState(() {})),
        TextField(controller: parts[index].quantity, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Quantity *')),
        DropdownButtonFormField<String>(key: ValueKey('${identityHashCode(parts[index])}-${parts[index].unit}'),
          initialValue: parts[index].unit, decoration: const InputDecoration(labelText: 'Unit'),
          items: ['SET', 'ST', 'UNT', 'PC'].map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(),
          onChanged: (value) => setState(() => parts[index].unit = value ?? 'PC')),
        TextField(controller: parts[index].purpose, decoration: const InputDecoration(labelText: 'Purpose')),
      ]))),
      TextButton.icon(onPressed: () => setState(() => parts.add(_PartDraft())), icon: const Icon(Icons.add), label: const Text('Add another item')),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      if (busy) const LinearProgressIndicator(),
      FilledButton(onPressed: busy ? null : submit, child: const Text('Submit Requisition')),
    ]));
}
class _PartDraft {
  final name = TextEditingController(), quantity = TextEditingController(), purpose = TextEditingController();
  String unit = 'PC';
  void dispose() { name.dispose(); quantity.dispose(); purpose.dispose(); }
}

class _PartNameField extends StatefulWidget {
  const _PartNameField({super.key, required this.session, required this.part, required this.onUnitChanged});
  final AirmsSession session;
  final _PartDraft part;
  final VoidCallback onUnitChanged;
  @override State<_PartNameField> createState() => _PartNameFieldState();
}

class _PartNameFieldState extends State<_PartNameField> {
  final focus = FocusNode();
  Timer? debounce;
  int requestId = 0;
  List<Map<String, dynamic>> suggestions = [];
  @override void initState() { super.initState(); focus.addListener(_focusChanged); widget.part.name.addListener(_changed); }
  void _focusChanged() { if (!focus.hasFocus) { debounce?.cancel(); setState(() => suggestions = []); } else { _changed(); } }
  void _changed() {
    debounce?.cancel();
    final value = widget.part.name.text.trim();
    final current = ++requestId;
    if (!focus.hasFocus || value.isEmpty) { if (mounted) setState(() => suggestions = []); return; }
    debounce = Timer(const Duration(milliseconds: 250), () async {
      try {
        final data = await widget.session.request('/api/parts-requisition/part-suggestions?q=${Uri.encodeQueryComponent(value)}');
        if (!mounted || current != requestId || !focus.hasFocus) return;
        setState(() => suggestions = (data as List? ?? []).whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList());
      } catch (_) { if (mounted && current == requestId) setState(() => suggestions = []); }
    });
  }
  @override void dispose() { debounce?.cancel(); widget.part.name.removeListener(_changed); focus.removeListener(_focusChanged); focus.dispose(); super.dispose(); }
  @override Widget build(BuildContext context) => Column(children: [
    TextField(controller: widget.part.name, focusNode: focus, autocorrect: false,
      decoration: const InputDecoration(labelText: 'Particular *', hintText: 'Enter or search a part name')),
    if (suggestions.isNotEmpty) ConstrainedBox(constraints: const BoxConstraints(maxHeight: 180), child: ListView(
      shrinkWrap: true, children: [for (final option in suggestions) ListTile(
        dense: true, title: Text('${option['value'] ?? ''}'),
        onTap: () { widget.part.name.text = '${option['value'] ?? ''}';
          final unit = '${option['unit'] ?? ''}';
          if (['SET', 'ST', 'UNT', 'PC'].contains(unit)) { widget.part.unit = unit; widget.onUnitChanged(); }
          focus.unfocus(); setState(() => suggestions = []); },
      )])),
  ]);
}
