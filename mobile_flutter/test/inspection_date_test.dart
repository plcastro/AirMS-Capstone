import 'package:flutter_test/flutter_test.dart';
import 'package:airms_flutter/src/flight_inspections.dart';

void main() {
  test('sorts ISO and legacy month/day/year inspection dates', () {
    expect(inspectionDate('10/12/2026').isAfter(inspectionDate('2026-10-11')), isTrue);
    expect(inspectionDate('2026-10-12T09:00:00Z').year, 2026);
  });
}
