import 'package:flutter_test/flutter_test.dart';
import 'package:airms_flutter/src/maintenance_tracking.dart';
import 'package:airms_flutter/src/maintenance_logs.dart';

void main() {
  test('rectification picks the same inspection names as React Native', () {
    expect(inferRectificationInspectionName({'issueTitle': '1500 FH limit nearing'}), '1500 FH Inspection');
    expect(inferRectificationInspectionName({'manualReferences': ['Inspect at 24 M']}), '24 M Inspection');
    expect(inferRectificationInspectionName({'component': 'tail rotor'}), 'OC Inspection');
  });
  test('maintenance log normalization keeps every work fallback', () {
    final log = normalizeMaintenanceLog({
      '_id': 'log-1', 'sourceTaskId': 'task-1', 'aircraft': 'RP-C123',
      'locationBase': 'CEBU', 'correctiveActionDone': 'Replaced seal',
      'defects': 'Oil leak', 'taskTitle': 'Hydraulic inspection',
    });
    expect(log['id'], 'task-1');
    expect(log['sn'], '123');
    expect(log['base'], 'CEBU');
    expect((log['workDetails'] as List).map((item) => item['description']), [
      'Replaced seal', 'Oil leak', 'Reference task: Hydraulic inspection',
    ]);
  });
}
