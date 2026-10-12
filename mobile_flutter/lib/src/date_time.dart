const _monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

String formatAirmsDateTime(Object? value, {String fallback = 'Not set', bool numeric = false}) {
  if (value == null || '$value'.trim().isEmpty) return fallback;
  final date = value is DateTime ? value.toLocal() : DateTime.tryParse('$value')?.toLocal();
  if (date == null) return fallback;
  final hour = date.hour % 12 == 0 ? 12 : date.hour % 12;
  final minute = date.minute.toString().padLeft(2, '0');
  final day = date.day.toString().padLeft(2, '0');
  final month = numeric ? date.month.toString().padLeft(2, '0') : _monthNames[date.month - 1];
  return numeric ? '$month/$day/${date.year} $hour:$minute ${date.hour < 12 ? 'AM' : 'PM'}'
    : '$month $day, ${date.year}, $hour:$minute ${date.hour < 12 ? 'AM' : 'PM'}';
}
