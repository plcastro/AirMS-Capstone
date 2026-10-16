import 'dart:async';
import 'package:flutter/material.dart';
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
  final events = [...legacy.where((event) => !history.any((item) => item['label'] == event['label'])), ...history]
    ..sort((a, b) => (DateTime.tryParse('${a['at']}') ?? DateTime(1970))
      .compareTo(DateTime.tryParse('${b['at']}') ?? DateTime(1970)));
  return events.map((event) => event['label'] == 'Delivered'
    ? {...event, 'label': 'Ready for pickup'} : event).toList();
}

String requisitionStatus(Map record) {
  final status = '${record['status'] ?? ''}';
  if (['Requested', 'Awaiting Stock', 'Ready for Delivery', 'Delivered', 'Closed', 'Cancelled'].contains(status)) return status;
  return switch (status) {
    'Completed' => 'Closed', 'Rejected' => 'Cancelled', 'Approved' || 'Ordered' => 'Ready for Delivery',
    'To Be Ordered' || 'In Progress' => 'Awaiting Stock',
    'Availability Checked' => _computedRequisitionStatus(record),
    _ => 'Requested',
  };
}
String _computedRequisitionStatus(Map record) {
  if (record['cancelledAt'] != null) return 'Cancelled';
  if (record['confirmedAt'] != null) return 'Closed';
  if (record['deliveredAt'] != null) return 'Delivered';
  final items = (record['items'] as List? ?? []).whereType<Map>().toList();
  if (items.isEmpty || items.any((item) => normalizeItemStatus(item['stockStatus']) == 'Pending Check')) return 'Requested';
  return items.any((item) => normalizeItemStatus(item['stockStatus']) == 'Out of Stock')
    ? 'Awaiting Stock' : 'Ready for Delivery';
}
String requisitionLabel(String status) => switch (status) {
  'Out of Stock' => 'Restocking', 'Requested' => 'Pending Stock Check',
  'Awaiting Stock' => 'Awaiting Restock', 'Ready for Delivery' => 'Stock Confirmed',
  'Delivered' => 'Ready for Pickup', 'Closed' => 'Received', _ => status,
};
String requisitionRole(Map? user) {
  final access = '${user?['access'] ?? ''}'.trim().toLowerCase();
  if (access == 'admin staff') return access;
  return '${user?['jobTitle'] ?? user?['access'] ?? ''}'.trim().toLowerCase();
}
String requisitionUserId(Map? user) => '${user?['_id'] ?? user?['id'] ?? user?['userId'] ?? ''}';
bool ownsRequisition(Map? user, Map record) {
  final ownerId = '${(record['staff'] as Map?)?['requisitionerId'] ?? ''}';
  return ownerId.isNotEmpty && ownerId == '${user?['id'] ?? user?['_id'] ?? user?['userId'] ?? ''}';
}
bool canCreateRequisition(Map? user) => ['mechanic', 'maintenance manager'].contains(requisitionRole(user));
bool canActOnRequisition(Map? user, Map record, String action) {
  final role = requisitionRole(user);
  if (action == 'stock' || action == 'deliver') return role == 'warehouse personnel';
  if (action == 'confirm') return role == 'admin staff' || ownsRequisition(user, record);
  if (action == 'cancel') return ownsRequisition(user, record) && canCreateRequisition(user);
  if (action == 'follow-up') return ['admin staff', 'officer-in-charge'].contains(role);
  return false;
}
bool isOpenRequisition(Map record) => !['Delivered', 'Closed', 'Cancelled'].contains(requisitionStatus(record));
String? followUpTarget(Map record) => switch (requisitionStatus(record)) {
  'Requested' || 'Awaiting Stock' => 'warehouse', 'Delivered' => 'requester', _ => null,
};
String requisitionSearchText(Map record) => '${record['wrsNo']} ${record['aircraft']} ${(record['staff'] as Map?)?['requisitioner']} ${requisitionStatus(record)}'.toLowerCase();
String requisitionItemsText(Map record) => (record['items'] as List? ?? []).whereType<Map>().map((item) {
  final name = item['particular'] ?? item['name'] ?? item['partName'] ?? 'Part';
  final quantity = item['quantity'];
  return '$name${quantity == null || quantity == 0 || quantity == '' ? '' : ' x $quantity ${item['unitOfMeasure'] ?? item['unit'] ?? ''}'.trimRight()}';
}).join(', ');
String requisitionPurpose(Map record) => '${record['purpose'] ?? (record['items'] as List? ?? []).whereType<Map>().map((item) => item['purpose']).firstWhere((value) => value != null && '$value'.isNotEmpty, orElse: () => '-') }';
bool validRequisitionQuantity(String text) {
  final quantity = num.tryParse(text);
  return quantity != null && quantity.isFinite && quantity > 0;
}
String formatRequisitionCardDate(Map record) {
  final raw = record['dateRequested'] ?? record['createdAt'] ?? record['updatedAt'];
  final date = DateTime.tryParse('$raw')?.toLocal();
  if (date == null) return '-';
  return '${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}/${date.year}';
}
String formatRequisitionReportDate(Map record) {
  final raw = record['dateRequested'] ?? record['createdAt'];
  final date = DateTime.tryParse('$raw')?.toLocal();
  return date == null ? 'N/A' : '${date.month}/${date.day}/${date.year}';
}
Future<bool> confirmRequisitionAction(BuildContext context, String title, String message) async =>
  await showDialog<bool>(context: context, builder: (_) => AlertDialog(title: Text(title), content: Text(message), actions: [
    TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
    FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Confirm')),
  ])) ?? false;
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
      final statusCounts = <String, int>{};
      for (final record in records) {
        final label = requisitionLabel(requisitionStatus(record));
        statusCounts[label] = (statusCounts[label] ?? 0) + 1;
      }
      await shareAirmsPdf(title: 'Parts Requisition Monitoring Report',
        fileName: 'Parts-Requisition-Monitoring-Report-${DateTime.now().toIso8601String().split('T').first}.pdf',
        portrait: true,
        executedBy: '${widget.session.user?['firstName'] ?? ''} ${widget.session.user?['lastName'] ?? ''}'.trim(),
        summaryRows: [
          ['Filter', tab == 'history' ? 'History' : 'Pending'],
          ['Total Requisitions', '${records.length}'],
          ['Total Items', '$totalItems'],
          ['Total Quantity', '$totalQuantity'],
        ],
        distributionRows: [for (final status in statusCounts.entries) [status.key, '${status.value}']],
        columns: const ['WRS No.', 'Aircraft', 'Requester', 'Date Requested', 'Status', 'Items', 'Total Qty'],
        rows: records.map((record) {
          final items = record['items'] as List? ?? [];
          final quantity = items.whereType<Map>().fold<num>(0, (sum, item) => sum + (num.tryParse('${item['quantity'] ?? 0}') ?? 0));
          return [
            '${record['wrsNo'] ?? 'N/A'}', '${record['aircraft'] ?? 'N/A'}',
            '${(record['staff'] as Map?)?['requisitioner'] ?? 'N/A'}',
            formatRequisitionReportDate(record),
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
      return canSee(record) && (tab == 'history' ? closed : !closed) && requisitionSearchText(record).contains(search.toLowerCase());
    }).toList()..sort((a, b) {
      final order = requisitionDate(a).compareTo(requisitionDate(b));
      return sortOrder == 'oldest' ? order : -order;
    });
    if (!['admin staff', 'officer-in-charge', 'warehouse personnel', 'maintenance manager', 'mechanic'].contains(role)) {
      return const Center(child: Text('Parts requisition access denied'));
    }
    return Stack(children: [RefreshIndicator(onRefresh: () => load(), child: ListView(padding: const EdgeInsets.fromLTRB(10, 10, 10, 96), children: [
      Row(children: [Expanded(child: TextField(decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search by WRS#', border: OutlineInputBorder()),
        onChanged: (value) => setState(() => search = value))),
        if (role == 'warehouse personnel') TextButton.icon(onPressed: exporting || filtered.isEmpty ? null : () => exportReport(filtered),
          icon: const Icon(Icons.picture_as_pdf, size: 18), label: Text(exporting ? 'Exporting...' : 'Export')),
        if (canCreateRequisition(widget.session.user)) TextButton.icon(onPressed: () async {
          final changed = await showDialog<bool>(context: context, builder: (_) => Dialog(
            insetPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            clipBehavior: Clip.antiAlias,
            child: RequisitionFormPage(session: widget.session)));
          if (changed == true) load();
        }, icon: const Icon(Icons.add, size: 18), label: const Text('Request'))]),
      const SizedBox(height: 10),
      Row(children: [Expanded(child: DropdownButtonFormField<String>(initialValue: sortOrder,
        decoration: const InputDecoration(border: OutlineInputBorder(), isDense: true),
        items: const [DropdownMenuItem(value: 'oldest', child: Text('Date: Oldest First')),
          DropdownMenuItem(value: 'newest', child: Text('Date: Newest First'))],
        onChanged: (value) => setState(() => sortOrder = value ?? 'oldest'))),
        const SizedBox(width: 8), Expanded(child: DropdownButtonFormField<String>(initialValue: tab,
          decoration: const InputDecoration(border: OutlineInputBorder(), isDense: true),
          items: [DropdownMenuItem(value: 'active', child: Text('Pending ($pendingCount)')),
            const DropdownMenuItem(value: 'history', child: Text('History'))],
          onChanged: (value) => setState(() => tab = value ?? 'active')))]),
      if (loading) const LinearProgressIndicator(),
      if (error.isNotEmpty) TextButton(onPressed: load, child: Text('$error - Tap to retry', style: const TextStyle(color: Colors.red, fontSize: 12))),
      if (!loading && filtered.isEmpty) const Padding(padding: EdgeInsets.all(30), child: Center(child: Text('No requisitions found'))),
      for (final record in filtered) Card(child: InkWell(onTap: () async { await showDialog<bool>(context: context, builder: (_) => Dialog(
          insetPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          clipBehavior: Clip.antiAlias,
          child: RequisitionDetailPage(session: widget.session, record: record)));
          load(); }, child: Padding(padding: const EdgeInsets.all(12), child: Column(
          crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Warehouse Slip', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              Text(formatRequisitionCardDate(record), style: const TextStyle(fontSize: 11, color: Colors.grey))])),
              Chip(label: Text(requisitionLabel(requisitionStatus(record))),
                backgroundColor: (requisitionStatusColors[requisitionStatus(record)] ?? Colors.grey).withValues(alpha: .14))]),
            Text('Slip No: ${record['wrsNo'] ?? '-'}', style: const TextStyle(fontSize: 12)),
            Text('Items: ${requisitionItemsText(record).isEmpty ? '-' : requisitionItemsText(record)}', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)),
            Text('Purpose: ${requisitionPurpose(record)}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)),
            if (oversight && followUpTarget(record) != null)
              Align(alignment: Alignment.centerRight, child: TextButton(onPressed: () async {
                if (!await confirmRequisitionAction(context, 'Send follow-up reminder', 'Continue for ${record['wrsNo']}?')) return;
                try { await widget.session.request('/api/parts-requisition/update-requisition/${record['_id']}', method: 'POST',
                  body: {'action': 'follow-up', 'confirmAction': true}, extraHeaders: {'x-action-confirmed': 'true'}); await load(silent: true); }
                catch (e) { if (mounted) AirmsToast.show('$e'); }
              }, child: const Text('Follow Up'))),
          ])))),
    ]))]);
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
  bool get open => isOpenRequisition(record);
  bool get owner => ownsRequisition(widget.session.user, record);
  bool get oversight => ['admin staff', 'officer-in-charge'].contains(role);
  List<Map> get items => (record['items'] as List? ?? []).whereType<Map>().toList();
  bool get allInStock => items.isNotEmpty && items.every((item) =>
    (stockDraft['${item['_id']}'] ?? normalizeItemStatus(item['stockStatus'])) == 'In Stock');
  @override void initState() { super.initState(); record = widget.record; }
  Future<void> act(String action, [Map<String, dynamic> extra = const {}]) async {
    if (action != 'stock') {
      final approved = await confirmRequisitionAction(context,
        {'confirm': 'Confirm receipt', 'deliver': 'Mark ready for pickup', 'cancel': 'Cancel requisition', 'follow-up': 'Send follow-up reminder'}[action] ?? '',
        action == 'confirm' ? 'Confirm you received all requested parts. This closes the requisition.' : 'Continue for ${record['wrsNo']}?');
      if (approved != true) return;
    }
    setState(() { busy = true; error = ''; });
    var saved = false;
    try {
      final data = await widget.session.request('/api/parts-requisition/update-requisition/${record['_id']}',
        method: 'POST', body: {'action': action, ...extra, 'confirmAction': true},
        extraHeaders: {'x-action-confirmed': 'true'});
      if (mounted) setState(() { record = Map<String, dynamic>.from(data as Map); stockDraft = {}; });
      saved = true;
      if (mounted) { AirmsToast.show(switch (action) {
        'stock' => 'Stock check saved.', 'deliver' => 'Ready for pickup.',
        'confirm' => 'Receipt confirmed.', 'cancel' => 'Requisition cancelled.',
        'follow-up' => 'Follow-up reminder sent.', _ => 'Requisition updated.',
      }); }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
    if (saved && action == 'stock') {
      await WidgetsBinding.instance.endOfFrame;
      if (mounted) Navigator.pop(context, true);
    }
  }
  List<Map<String, String>> stockUpdates() => stockDraft.entries.map((entry) => {'itemId': entry.key, 'stockStatus': entry.value}).toList();
  @override Widget build(BuildContext context) => PopScope(canPop: stockDraft.isEmpty && !busy,
    onPopInvokedWithResult: (didPop, result) async {
      if (didPop || busy) return;
      if (stockDraft.isEmpty || await confirmRequisitionAction(context, 'Discard unsaved stock changes?', 'Choose Save or Deliver to keep your stock updates.')) {
        setState(() => stockDraft = {});
        await Future<void>.delayed(Duration.zero);
        if (context.mounted) Navigator.pop(context, true);
      }
    }, child: Scaffold(appBar: AppBar(title: const Text('Requisition details')),
    body: ListView(padding: const EdgeInsets.all(16), children: [
      Row(children: [Container(width: 5, height: 32, margin: const EdgeInsets.only(right: 10),
        decoration: BoxDecoration(color: const Color(0xff1677ff), borderRadius: BorderRadius.circular(3))),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${record['wrsNo'] ?? ''}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          Text('${record['aircraft'] ?? ''} ? ${(record['staff'] as Map?)?['requisitioner'] ?? ''}',
            style: const TextStyle(fontSize: 12, color: Colors.grey)),
        ]))]),
      Align(alignment: Alignment.centerLeft, child: Chip(label: Text(requisitionLabel(status)),
        backgroundColor: (requisitionStatusColors[status] ?? Colors.grey).withValues(alpha: .1))),
      if (status == 'Delivered') const Card(child: Padding(padding: EdgeInsets.all(12),
        child: Text('Ready for pickup. Awaiting requester confirmation of receipt.'))),
      const SizedBox(height: 12), const Text('ITEMS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
      for (final item in items) Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(
        crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('${item['particular'] ?? ((item['codeParticular'] is List && (item['codeParticular'] as List).isNotEmpty) ? (item['codeParticular'] as List).first['particular'] : null) ?? 'Part'}', style: const TextStyle(fontWeight: FontWeight.bold)),
        Text('${item['quantity'] ?? ''} ${item['unitOfMeasure'] ?? ''} · ${item['purpose'] ?? ''}'),
        Text(requisitionLabel(stockDraft['${item['_id']}'] ?? itemDisplayStatus(record, item))),
        if (canActOnRequisition(widget.session.user, record, 'stock') && open) Wrap(children: [for (final option in ['In Stock', 'Out of Stock'])
          ChoiceChip(label: Text(option),
            selected: (stockDraft['${item['_id']}'] ?? normalizeItemStatus(item['stockStatus'])) == option,
            onSelected: busy || (stockDraft['${item['_id']}'] ?? normalizeItemStatus(item['stockStatus'])) == option ? null : (_) => setState(() {
              final id = '${item['_id']}';
              if (normalizeItemStatus(item['stockStatus']) == option) { stockDraft.remove(id); }
              else { stockDraft[id] = option; }
            }))]),
      ]))),
      const SizedBox(height: 12), const Text('HISTORY', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
      for (final event in requisitionTimeline(record))
        ListTile(title: Text('${event['label'] ?? ''}'),
          subtitle: Text('${formatAirmsDateTime(event['at'], fallback: 'N/A')}${event['actorName'] == null || '${event['actorName']}'.isEmpty ? '' : '\n${event['actorName']}'}${event['details'] == null || '${event['details']}'.isEmpty ? '' : '\n${event['details']}'}')),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      if (busy) const LinearProgressIndicator(),
      const SizedBox(height: 16),
      if (canActOnRequisition(widget.session.user, record, 'stock') && open) ...[
        const Text('Choose stock status for each item, then Save. When all items are In Stock, Deliver saves your selections and marks the requisition ready for pickup.'),
        if (!allInStock) OutlinedButton(onPressed: busy || stockDraft.isEmpty ? null : () => act('stock', {'stockUpdates': stockUpdates()}),
          child: const Text('Save')),
        if (allInStock) FilledButton(onPressed: busy ? null : () => act('deliver', {'stockUpdates': stockUpdates()}),
          child: const Text('Deliver')),
      ],
      if (canActOnRequisition(widget.session.user, record, 'confirm') && status == 'Delivered')
        FilledButton(onPressed: busy ? null : () => act('confirm'), child: const Text('Confirm Receipt')),
      if (canActOnRequisition(widget.session.user, record, 'cancel') && open)
        OutlinedButton(onPressed: busy ? null : () => act('cancel'), child: const Text('Cancel Requisition')),
      if (canActOnRequisition(widget.session.user, record, 'follow-up') && followUpTarget(record) != null)
        OutlinedButton(onPressed: busy ? null : () => act('follow-up'), child: const Text('Follow Up')),
    ])));
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
    if (aircraft == null || aircraft!.isEmpty || parts.isEmpty || parts.any((part) => part.name.text.trim().isEmpty ||
        !validRequisitionQuantity(part.quantity.text))) {
      AirmsToast.show('Choose an aircraft and add part names with positive quantities.'); return;
    }
    final confirmed = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: const Text('Submit requisition'), content: const Text('Send these parts to warehouse for a stock check?'),
      actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Submit'))]));
    if (confirmed != true) return;
    setState(() { busy = true; error = ''; });
    try {
      await widget.session.request('/api/parts-requisition/create-requisition', method: 'POST',
        extraHeaders: {'x-action-confirmed': 'true'}, body: {
          'aircraft': aircraft,
          'items': parts.map((part) => {'particular': part.name.text.trim(),
            'quantity': num.parse(part.quantity.text), 'unitOfMeasure': part.unit,
            'purpose': part.purpose.text}).toList(),
          'confirmAction': true,
        });
      if (mounted) { AirmsToast.show('Requisition submitted'); Navigator.pop(context, true); }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('New parts requisition')),
    body: ListView(padding: const EdgeInsets.all(14), children: [
      DropdownButtonFormField<String>(initialValue: aircraft, decoration: const InputDecoration(labelText: 'Choose Aircraft *', border: OutlineInputBorder()),
        items: aircraftOptions.map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(),
        onChanged: (value) => setState(() => aircraft = value)),
      const SizedBox(height: 16),
      for (var index = 0; index < parts.length; index++) Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(children: [
        Row(children: [Expanded(child: Text('Item ${index + 1}', style: const TextStyle(fontWeight: FontWeight.bold))),
          if (parts.length > 1) IconButton(icon: const Icon(Icons.delete_outline), onPressed: () {
            final removed = parts.removeAt(index); setState(() {}); removed.dispose();
          })]),
        _PartNameField(key: ObjectKey(parts[index]), session: widget.session, part: parts[index], onUnitChanged: () => setState(() {})),
        TextField(controller: parts[index].quantity, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Quantity: *')),
        DropdownButtonFormField<String>(key: ValueKey('${identityHashCode(parts[index])}-${parts[index].unit}'),
          initialValue: parts[index].unit, decoration: const InputDecoration(labelText: 'Unit'),
          items: ['SET', 'ST', 'UNT', 'PC'].map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(),
          onChanged: (value) => setState(() => parts[index].unit = value ?? 'PC')),
        TextField(controller: parts[index].purpose, decoration: const InputDecoration(labelText: 'Purpose:')),
      ]))),
      TextButton.icon(onPressed: () => setState(() => parts.add(_PartDraft())), icon: const Icon(Icons.add), label: const Text('Add Another Item')),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      if (busy) const LinearProgressIndicator(),
      Row(mainAxisAlignment: MainAxisAlignment.end, children: [
        OutlinedButton(onPressed: busy ? null : () => Navigator.pop(context), child: const Text('Cancel')),
        const SizedBox(width: 10),
        FilledButton(onPressed: busy ? null : submit, child: Text(busy ? 'Submitting...' : 'Submit')),
      ]),
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
