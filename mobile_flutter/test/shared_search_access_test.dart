import 'package:flutter_test/flutter_test.dart';
import 'package:airms_flutter/src/search.dart';
import 'package:airms_flutter/src/access.dart';

void main() {
  test('nested search is case and punctuation insensitive', () {
    final record = {'aircraft': 'RP-C7247', 'details': [{'title': 'Hydraulic Pump'}]};
    expect(matchesSearch('rpc7247', record), isTrue);
    expect(matchesSearch('hydraulic pump', record), isTrue);
    expect(matchesSearch('avionics', record), isFalse);
  });

  test('date search matches alternate display formats', () {
    final record = {'date': '2026-10-12'};
    expect(matchesSearch('10/12/2026', record), isTrue);
    expect(matchesSearch('Oct 12, 2026', record), isTrue);
  });

  test('admin access overrides a different job title', () {
    expect(resolveUserRole({'jobTitle': 'Pilot', 'access': 'Admin Staff'}), 'admin staff');
    expect(canExportModule('admin staff', 'activityLogs'), isTrue);
    expect(canExportModule('pilot', 'activityLogs'), isFalse);
    expect(baseLabel('CDO'), 'Cagayan de Oro');
  });
}
