import 'package:flutter_test/flutter_test.dart';
import 'package:airms_flutter/src/activity_logs.dart';

void main() {
  test('audit action categories include newer server wording', () {
    expect(activityCategory({'actionMade': 'Generated document for flight'}), 'export');
    expect(activityCategory({'actionMade': 'User logged in'}), 'authentication');
    expect(activityCategory({'actionMade': 'Session refreshed'}), 'authentication');
    expect(activityCategory({'actionMade': 'Security setup completed'}), 'authentication');
  });

  test('platform labels and filters use device presentation', () {
    final log = {'platform': 'MOBILE', 'devicePlatform': 'MOBILE_IOS'};
    expect(activityPlatformLabel(log), 'IOS');
    expect(activityMatchesPlatform(log, 'IOS'), isTrue);
    expect(activityMatchesPlatform(log, 'MOBILE'), isTrue);
    expect(activityMatchesPlatform(log, 'ANDROID'), isFalse);
  });

  test('date range uses the same rolling threshold as the source', () {
    final now = DateTime.utc(2026, 10, 16, 12);
    expect(activityWithinRange({'dateTime': '2026-10-09T12:00:00Z'}, '7', now), isTrue);
    expect(activityWithinRange({'dateTime': '2026-10-09T11:59:59Z'}, '7', now), isFalse);
    expect(activityWithinRange({'dateTime': 'invalid'}, 'all', now), isTrue);
  });
}
