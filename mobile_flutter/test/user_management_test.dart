import 'package:flutter_test/flutter_test.dart';
import 'package:airms_flutter/src/user_management.dart';

void main() {
  test('invitation status derives from expiry when server omits it', () {
    final now = DateTime.utc(2026, 10, 13);
    expect(invitationDisplayStatus({'status': 'active'}, now: now), 'claimed');
    expect(invitationDisplayStatus({'status': 'inactive', 'tempPasswordExpires': '2026-10-12T00:00:00Z'}, now: now), 'expired');
    expect(invitationDisplayStatus({'status': 'inactive', 'tempPasswordExpires': '2026-10-14T00:00:00Z'}, now: now), 'pending');
  });

  test('list cards conceal the local part of email addresses', () {
    expect(maskUserEmail('alex@example.com'), 'a***@example.com');
  });
}
