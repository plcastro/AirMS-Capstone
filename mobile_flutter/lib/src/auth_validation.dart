String? loginValidationMessage(String identifier, String password, String base) {
  if (identifier.trim().isEmpty && password.trim().isEmpty) {
    return 'Username/email and password are required';
  }
  if (identifier.trim().isEmpty) return 'Please enter your username or email';
  if (password.trim().isEmpty) return 'Password is required';
  if (!{'MANILA', 'CEBU', 'CDO'}.contains(base)) {
    return 'Select your base: Manila, Cebu or Cagayan de Oro.';
  }
  return null;
}

String? forgotEmailValidation(String email) {
  final value = email.trim();
  if (value.isEmpty) return 'Email is required.';
  if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value)) {
    return 'Please enter a valid email address.';
  }
  return null;
}

String? resetPasswordValidation(String password, String confirmation) {
  if (password.isEmpty || confirmation.isEmpty) return 'Please fill in all fields.';
  if (password != confirmation) return 'Passwords do not match.';
  if (password.length < 8 || !RegExp('[A-Z]').hasMatch(password) ||
      !RegExp(r'\d').hasMatch(password)) {
    return 'Password must be at least 8 characters, contain one uppercase letter, and one number.';
  }
  return null;
}

String? securitySetupValidation(String password, String confirmation, String pin, String confirmPin) {
  if (password.trim().isEmpty || confirmation.trim().isEmpty || pin.isEmpty || confirmPin.isEmpty) {
    return 'Please fill all fields.';
  }
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!RegExp('[A-Z]').hasMatch(password)) return 'Password must contain an uppercase letter.';
  if (!RegExp(r'\d').hasMatch(password)) return 'Password must contain a number.';
  if (password != confirmation) return 'Passwords do not match.';
  if (!RegExp(r'^\d{6}$').hasMatch(pin)) return 'PIN must be exactly 6 digits.';
  if (pin != confirmPin) return 'PINs do not match.';
  return null;
}
