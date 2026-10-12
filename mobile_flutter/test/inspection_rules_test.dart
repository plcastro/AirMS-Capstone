import 'package:flutter_test/flutter_test.dart';
import 'package:airms_flutter/src/inspection_rules.dart';

void main() {
  test('bulk checks never tick flagged items', () {
    expect(setInspectionChecks(['a', 'b'], {}, {'b'}, true), {'a'});
    expect(setInspectionChecks(['a', 'b'], {'a'}, {'b'}, false), isEmpty);
  });
  test('sign requires all checks, no flags and held resolution', () {
    expect(canSignInspection(2, {'a', 'b'}, {}, held: true), isFalse);
    expect(canSignInspection(2, {'a', 'b'}, {}, held: true, resolution: 'Fixed'), isTrue);
    expect(canSignInspection(2, {'a', 'b'}, {'a'}), isFalse);
    expect(canSignInspection(2, {'a', 'b'}, {'a'}, held: true, resolution: 'Fixed'), isFalse);
    expect(canSignInspection(2, {'a', 'b'}, {}, held: true, resolution: '  '), isFalse);
  });
}
