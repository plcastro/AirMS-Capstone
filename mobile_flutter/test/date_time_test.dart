import 'package:flutter_test/flutter_test.dart';
import 'package:airms_flutter/src/date_time.dart';

void main() {
  test('formats a readable local task timestamp', () {
    expect(formatAirmsDateTime(DateTime(2026, 10, 13, 14, 5)), 'Oct 13, 2026, 2:05 PM');
    expect(formatAirmsDateTime(DateTime(2026, 10, 13, 14, 5), numeric: true), '10/13/2026 2:05 PM');
    expect(formatAirmsDateTime(null), 'Not set');
  });

  test('formats RN style calendar dates and legacy slash dates', () {
    expect(formatAirmsDate(DateTime(2026, 10, 13)), '10/13/2026');
    expect(formatAirmsDate('10/13/2026'), '10/13/2026');
    expect(formatAirmsDateTime('10/13/2026', numeric: true), '10/13/2026 12:00 AM');
    expect(formatAirmsDate('02/30/2026'), 'N/A');
    expect(formatAirmsDate(null), 'N/A');
  });
}
