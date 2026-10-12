import 'package:flutter_test/flutter_test.dart';
import 'package:airms_flutter/src/activity_logs.dart';

void main() {
  test('audit action categories include newer server wording', () {
    expect(activityCategory({'actionMade': 'Generated document for flight'}), 'export');
    expect(activityCategory({'actionMade': 'User logged in'}), 'authentication');
    expect(activityCategory({'actionMade': 'Session refreshed'}), 'authentication');
    expect(activityCategory({'actionMade': 'Security setup completed'}), 'authentication');
  });
}
