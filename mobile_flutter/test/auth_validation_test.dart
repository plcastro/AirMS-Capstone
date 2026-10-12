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
}
