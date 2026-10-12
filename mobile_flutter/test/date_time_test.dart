import 'package:flutter_test/flutter_test.dart';
import 'package:airms_flutter/src/date_time.dart';

void main() {
  test('formats a readable local task timestamp', () {
    expect(formatAirmsDateTime(DateTime(2026, 10, 13, 14, 5)), 'Oct 13, 2026, 2:05 PM');
    expect(formatAirmsDateTime(DateTime(2026, 10, 13, 14, 5), numeric: true), '10/13/2026 2:05 PM');
    expect(formatAirmsDateTime(null), 'Not set');
  });
}
