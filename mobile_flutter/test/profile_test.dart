import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import 'dart:typed_data';
import 'package:airms_flutter/src/profile.dart';

void main() {
  test('profile initials include both names and have a fallback', () {
    expect(profileInitials('Ada', 'Lovelace'), 'AL');
    expect(profileInitials('', ''), 'U');
  });

  test('password rules report the first unmet RN requirement', () {
    expect(passwordValidation('short', '', ''), 'Use at least 8 characters');
    expect(passwordValidation('longlower1', '', ''), 'Include at least one uppercase letter.');
    expect(passwordValidation('Longlower', '', ''), 'Include at least one number.');
    expect(passwordValidation('Longlower1', 'different', ''), 'Passwords must match');
    expect(passwordValidation('Longlower1', 'Longlower1', ''), 'Enter your current password.');
    expect(passwordValidation('Longlower1', 'Longlower1', 'old'), isNull);
  });

  test('photo is square, downscaled, and encoded as jpeg', () {
    final source = img.Image(width: 1200, height: 900);
    final bytes = prepareProfilePhoto(img.encodePng(source));
    final output = img.decodeJpg(Uint8List.fromList(bytes!));
    expect(output, isNotNull);
    expect(output!.width, 800);
    expect(output.height, 800);
    expect(prepareProfilePhoto([1, 2, 3]), isNull);
  });
}
