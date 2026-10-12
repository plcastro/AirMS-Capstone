import 'package:flutter_test/flutter_test.dart';
import 'package:airms_flutter/src/reports.dart';

void main() {
  test('report drilldown separates completed, due soon, and overdue', () {
    final now = DateTime.utc(2026, 10, 13, 12);
    expect(reportTaskBucket({'status': 'Approved'}, now), 'completed');
    expect(reportTaskBucket({'status': 'Pending', 'dueDate': '2026-10-15T12:00:00Z'}, now), 'dueSoon');
    expect(reportTaskBucket({'status': 'Pending', 'dueDate': '2026-10-12T12:00:00Z'}, now), 'overdue');
    expect(reportTaskBucket({'status': 'Pending', 'dueDate': '2026-10-20T12:00:00Z'}, now), 'other');
  });
}
