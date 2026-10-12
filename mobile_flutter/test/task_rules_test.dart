import 'package:flutter_test/flutter_test.dart';
import 'package:airms_flutter/src/task_rules.dart';

void main() {
  test('inspection conflict uses title or checklist and active statuses', () {
    final tasks = <Map>[
      {'_id': '1', 'aircraft': 'RP-C123', 'title': 'Other', 'status': 'Returned',
       'checklistItems': [{'inspectionName': '50 Hour'}]},
      {'_id': '2', 'aircraft': 'RP-C123', 'title': 'Daily', 'status': 'Ongoing'},
    ];
    expect(inspectionConflictMessage(tasks, 'rp-c123', '50 HOUR'),
      'This inspection type for this aircraft is pending.');
    expect(inspectionConflictMessage(tasks, 'RP-C123', 'Daily'),
      'This inspection type for this aircraft is ongoing.');
    expect(inspectionConflictMessage(tasks, 'RP-C123', 'Daily', editingId: '2'), isNull);
    expect(inspectionConflictMessage(tasks, 'RP-C123', 'Daily', custom: true), isNull);
  });
  test('mechanic rank prefers qualification, workload, name, id', () {
    final ranked = rankTaskMechanics([
      {'id': '3', 'name': 'Zoe', 'activeTaskCount': 1},
      {'id': '2', 'name': 'Amy', 'activeTaskCount': 1},
      {'id': '1', 'name': 'Amy', 'activeTaskCount': 1},
      {'id': '4', 'name': 'Bob', 'activeTaskCount': 0},
    ], (id) => id != '4');
    expect(ranked.map((item) => item['id']), ['1', '2', '3', '4']);
  });
}
