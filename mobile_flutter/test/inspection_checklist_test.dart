import 'package:flutter_test/flutter_test.dart';
import 'package:airms_flutter/src/inspection_checklist.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('keeps Bell 412 checklist sections and item keys', () async {
    final items = await loadInspectionChecklist('pre', 'B412EP');
    expect(items, isNotEmpty);
    expect(items.first['_section'], 'FUSELAGE - FRONT');
    expect(items.first['key'], 'fuselageFront_cabinNose');
  });
  test('groups AS350 checklist by station', () async {
    final items = await loadInspectionChecklist('pre', 'AS350 B3');
    expect(items, isNotEmpty);
    expect(items.first['_section'], 'Station 1');
  });
}
