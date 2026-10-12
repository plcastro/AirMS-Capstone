import 'package:flutter_test/flutter_test.dart';
import 'package:airms_flutter/src/flight_review.dart';

void main() {
  test('review tables show six rows on each page', () {
    final rows = List.generate(14, (index) => index);
    expect(reviewPage(rows, 1), [0, 1, 2, 3, 4, 5]);
    expect(reviewPage(rows, 2), [6, 7, 8, 9, 10, 11]);
    expect(reviewPage(rows, 3), [12, 13]);
    expect(reviewPage(rows, 4), isEmpty);
  });

  test('monitoring rows use zero and labelled units', () {
    expect(monitoringValue(null), '0');
    expect(monitoringValue(''), '0');
    expect(monitoringDelta(2), '+2');
    expect(monitoringDelta(-1), '-1');
    expect(monitoringUnit('FH'), 'Flight Hours');
    expect(monitoringUnit('landings'), 'Landings');
    expect(monitoringUnit('cycles'), 'Cycles');
    expect(monitoringUnit(''), 'Count');
  });
}
