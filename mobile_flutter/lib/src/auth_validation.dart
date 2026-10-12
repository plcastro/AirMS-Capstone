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
