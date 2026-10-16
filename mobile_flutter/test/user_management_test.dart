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
    expect(maskUserEmail('alex@example.com'), 'al**@example.com');
    expect(maskUserEmail(null), '');
    expect(maskUserEmail('a@example.com'), 'a@example.com');
  });

  test('username follows the source naming and collision rules', () {
    final users = <Map<String, dynamic>>[
      {'_id': '1', 'username': 'smitha'}, {'_id': '2', 'username': 'smitha2'},
    ];
    expect(suggestUserName('Alex', 'Smith', users), 'smitha3');
    expect(suggestUserName('', 'Smith', users), '');
    expect(suggestUserName('Alex', 'Smith', users, excludeId: '1'), 'smitha');
  });

  test('form validation matches the ordered source messages', () {
    String? validate({String first = 'Alex', String last = 'Smith', String email = 'a@b.com',
      String username = 'smitha', String? role = 'Pilot', String? access = 'User', String license = '123456'}) =>
      validateUserForm(first: first, last: last, email: email, username: username,
        jobTitle: role, access: access, license: license);
    expect(validate(first: ''), 'First name, last name, and email are required.');
    expect(validate(role: null), 'Job title and access are required.');
    expect(validate(email: 'bad'), 'Please enter a valid email.');
    expect(validate(username: ''), 'Username is required.');
    expect(validate(license: '12345'), 'License number must be 6 digits.');
    expect(validate(), isNull);
  });
}
