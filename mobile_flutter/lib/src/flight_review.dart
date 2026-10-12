import 'package:flutter/material.dart';

Map<String, dynamic> _map(dynamic value) => value is Map ? Map<String, dynamic>.from(value) : {};
String _text(dynamic value, {String missing = 'Missing'}) => value == null ? missing : '$value';

List<T> reviewPage<T>(List<T> items, int page, {int pageSize = 6}) {
  if (pageSize < 1 || page < 1) return [];
  final start = (page - 1) * pageSize;
  if (start >= items.length) return [];
  return items.sublist(start, (start + pageSize).clamp(0, items.length));
}

String monitoringUnit(dynamic unit) {
  final value = '$unit'.trim().toLowerCase();
  if (value.contains('hour') || value == 'fh' || value == 'h') return 'Flight Hours';
  if (value.contains('landing')) return 'Landings';
  if (value.contains('cycle') || value == 'cyc') return 'Cycles';
  return 'Count';
}

String monitoringValue(dynamic value) => value == null || '$value'.isEmpty ? '0' : '$value';
String monitoringDelta(dynamic value) {
  if (value == null) return '';
  final parsed = num.tryParse('$value');
  return '${parsed != null && parsed > 0 ? '+' : ''}$value';
}

class ClosureReviewDecision {
  const ClosureReviewDecision.continueToPostFlight() : reconcileReason = null;
  const ClosureReviewDecision.reconcile(this.reconcileReason);
  final String? reconcileReason;
}

class FlightClosureReviewPage extends StatefulWidget {
  const FlightClosureReviewPage({super.key, required this.review});
  final Map<String, dynamic> review;
  @override
  State<FlightClosureReviewPage> createState() => _FlightClosureReviewPageState();
}

class _FlightClosureReviewPageState extends State<FlightClosureReviewPage> {
  final reason = TextEditingController();
  int totalsPage = 1, monitoringPage = 1;
  @override
  void dispose() { reason.dispose(); super.dispose(); }

  Widget pagedRows(List<Map<String, dynamic>> rows, int page, void Function(int) changePage,
      Widget Function(Map<String, dynamic>) render) {
    final pages = (rows.length / 6).ceil().clamp(1, 999999);
    return Column(children: [
      ...reviewPage(rows, page).map(render),
      if (pages > 1) Padding(padding: const EdgeInsets.only(top: 8), child: Row(
        mainAxisAlignment: MainAxisAlignment.center, children: [
          OutlinedButton(onPressed: page > 1 ? () => changePage(page - 1) : null, child: const Text('Previous')),
          Padding(padding: const EdgeInsets.symmetric(horizontal: 10), child: Text('Page $page of $pages')),
          OutlinedButton(onPressed: page < pages ? () => changePage(page + 1) : null, child: const Text('Next')),
        ],
      )),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final missing = widget.review['missing'] is List ? widget.review['missing'] as List : <dynamic>[];
    final totals = (widget.review['totals'] as List? ?? []).map(_map).toList();
    final monitoring = _map(widget.review['monitoringReconciliation']);
    final required = monitoring['required'] == true;
    final rows = (monitoring['rows'] as List? ?? []).map(_map).toList();
    final danger = Theme.of(context).colorScheme.error;
    return Scaffold(appBar: AppBar(title: const Text('Review Before Closure')), body: SafeArea(child: ListView(
      padding: const EdgeInsets.all(16), children: [
        const Text('Review Before Closure', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        const SizedBox(height: 12),
        ...missing.map((item) => Padding(padding: const EdgeInsets.only(bottom: 5),
          child: Text('• $item', style: TextStyle(color: danger)))),
        pagedRows(totals, totalsPage, (value) => setState(() => totalsPage = value), (row) => Card(
          child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start,
            children: [Text(_text(row['item']), style: const TextStyle(fontWeight: FontWeight.w600)),
              Text('Unit: ${_text(row['unit'])}'),
              Text('Brought forward: ${_text(row['broughtForward'])} · This flight: ${_text(row['thisFlight'])} · To date: ${_text(row['toDate'])}')]),
          ))),
        if (required) Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(
          crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [Icon(Icons.warning_amber_rounded, size: 20, color: danger), const SizedBox(width: 6),
              Expanded(child: Text('Parts Monitoring changed since release',
                style: TextStyle(fontWeight: FontWeight.bold, color: danger)))]),
            const SizedBox(height: 6),
            const Text('Compare the baseline before signing reconciliation. Confirm this flight has not already been added.'),
            const SizedBox(height: 10),
            pagedRows(rows, monitoringPage, (value) => setState(() => monitoringPage = value), (row) => Padding(
              padding: const EdgeInsets.only(bottom: 10), child: Row(crossAxisAlignment: CrossAxisAlignment.start,
                children: [SizedBox(width: 16, child: row['changed'] == true ? Icon(Icons.circle, size: 10, color: danger) : null),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${_text(row['item'])} (${monitoringUnit(row['unit'])})',
                      style: TextStyle(fontWeight: row['changed'] == true ? FontWeight.bold : FontWeight.normal)),
                    Text('At release: ${monitoringValue(row['previous'])} · Current ledger: ${monitoringValue(row['current'])}${row['delta'] == null ? '' : ' · Change: ${monitoringDelta(row['delta'])}'}'),
                  ]))])),
            ),
            TextField(controller: reason, maxLines: 3, onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(border: OutlineInputBorder(),
                hintText: 'Reason for using the current monitoring baseline')),
            const SizedBox(height: 8),
            FilledButton(onPressed: reason.text.trim().isEmpty ? null : () => Navigator.pop(context,
              ClosureReviewDecision.reconcile(reason.text.trim())), child: const Text('Sign Reconciliation')),
          ],
        ))),
        const SizedBox(height: 12),
        FilledButton(onPressed: missing.isNotEmpty || required ? null : () => Navigator.pop(context,
          const ClosureReviewDecision.continueToPostFlight()), child: const Text('Continue to Post-Flight')),
      ],
    )));
  }
}
