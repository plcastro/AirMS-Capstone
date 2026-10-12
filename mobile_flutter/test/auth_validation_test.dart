import 'package:flutter_test/flutter_test.dart';
import 'package:airms_flutter/src/auth_validation.dart';

void main() {
  test('login validation uses React Native messages and trims whitespace', () {
    expect(loginValidationMessage('', ' ', ''), 'Username/email and password are required');
    expect(loginValidationMessage(' ', 'secret', 'CEBU'), 'Please enter your username or email');
    expect(loginValidationMessage('user', ' ', 'CEBU'), 'Password is required');
    expect(loginValidationMessage('user', 'secret', ''), 'Select your base: Manila, Cebu or Cagayan de Oro.');
    expect(loginValidationMessage(' user ', ' secret ', 'CDO'), isNull);
  });
  test('forgot, reset, and setup validation follows React Native order', () {
    expect(forgotEmailValidation(' '), 'Email is required.');
    expect(forgotEmailValidation('bad-email'), 'Please enter a valid email address.');
    expect(forgotEmailValidation(' Me@Example.com '), isNull);
    expect(resetPasswordValidation('', ''), 'Please fill in all fields.');
    expect(resetPasswordValidation('Password1', 'Password2'), 'Passwords do not match.');
    expect(resetPasswordValidation('Password1', 'Password1'), isNull);
    expect(securitySetupValidation('short', 'short', '123456', '123456'), 'Password must be at least 8 characters.');
    expect(securitySetupValidation('Password1', 'Password1', '123456', '123456'), isNull);
  });
}
