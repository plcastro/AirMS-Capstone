import 'package:flutter_test/flutter_test.dart';
import 'package:airms_flutter/src/parts_monitoring.dart';

void main() {
  test('component status follows source thresholds and due text', () {
    expect(partStatus({'daysRemaining': 0, 'timeRemaining': 40}), 'Due');
    expect(partStatus({'daysRemaining': 31, 'timeRemaining': 30}), 'Due Soon');
    expect(partStatus({'daysRemaining': 31, 'timeRemaining': 31}), 'OK');
    expect(partStatus({'due': 'OVERDUE', 'daysRemaining': 90, 'timeRemaining': 90}), 'Due');
    expect(partStatus({'daysRemaining': 'unknown', 'timeRemaining': 'unknown'}), 'OK');
  });

  test('reference defaults preserve supplied workbook values', () {
    final values = normalizeReferences({'acftTT': 24, 'usage': 'Sling', 'referenceCells': {'A1': 1}});
    expect(values['engTT'], 24);
    expect(values['n1Cycles'], 0);
    expect(values['usage'], 'Sling');
    expect(values['referenceCells'], {'A1': 1});
    expect(values['today'], matches(RegExp(r'^\d{4}-\d{2}-\d{2}$')));
  });

  test('lifespan dates and creep damage match the source display', () {
    expect(lifespanDate('2026-10-16T00:00:00.000Z'), '10/16/26');
    expect(lifespanDate('invalid'), 'invalid');
    expect(lifespanDate(null), 'N/A');
    expect(creepDamage('10.126%'), '10.13%');
    expect(creepDamage(0), '0%');
    expect(creepDamage(101), 'N/A');
  });
}
