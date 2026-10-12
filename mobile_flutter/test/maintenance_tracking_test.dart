import 'package:flutter_test/flutter_test.dart';
import 'package:airms_flutter/src/maintenance_tracking.dart';

void main() {
  test('rectification picks the same inspection names as React Native', () {
    expect(inferRectificationInspectionName({'issueTitle': '1500 FH limit nearing'}), '1500 FH Inspection');
    expect(inferRectificationInspectionName({'manualReferences': ['Inspect at 24 M']}), '24 M Inspection');
    expect(inferRectificationInspectionName({'component': 'tail rotor'}), 'OC Inspection');
  });
}
