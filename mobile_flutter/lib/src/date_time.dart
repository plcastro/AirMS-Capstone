const _monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

DateTime? parseAirmsDate(Object? value) {
  if (value == null || '$value'.trim().isEmpty) return null;
  if (value is DateTime) return value.toLocal();
  final raw = '$value'.trim();
  final slash = RegExp(r'^(\d{1,2})/(\d{1,2})/(\d{4})$').firstMatch(raw);
  if (slash != null) {
    final month = int.parse(slash[1]!);
    final day = int.parse(slash[2]!);
    final year = int.parse(slash[3]!);
    final date = DateTime(year, month, day);
    return date.year == year && date.month == month && date.day == day ? date : null;
  }
  return DateTime.tryParse(raw)?.toLocal();
}

String formatAirmsDate(Object? value, {String fallback = 'N/A'}) {
  final date = parseAirmsDate(value);
  if (date == null) return fallback;
  return '${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}/${date.year}';
}

String formatAirmsDateTime(Object? value, {String fallback = 'Not set', bool numeric = false}) {
  final date = parseAirmsDate(value);
  if (date == null) return fallback;
  final hour = date.hour % 12 == 0 ? 12 : date.hour % 12;
  final minute = date.minute.toString().padLeft(2, '0');
  final day = date.day.toString().padLeft(2, '0');
  final month = numeric ? date.month.toString().padLeft(2, '0') : _monthNames[date.month - 1];
  return numeric ? '$month/$day/${date.year} $hour:$minute ${date.hour < 12 ? 'AM' : 'PM'}'
    : '$month $day, ${date.year}, $hour:$minute ${date.hour < 12 ? 'AM' : 'PM'}';
}
