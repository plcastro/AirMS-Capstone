/// Mirrors the React Native search index, including punctuation-free and date searches.
String normalizeSearchText(Object? value) => '${value ?? ''}'.trim().toLowerCase();
String compactSearchText(Object? value) =>
    normalizeSearchText(value).replaceAll(RegExp(r'[^a-z0-9]'), '');

bool _potentialDate(String raw) =>
    RegExp(r'^\d{1,2}/\d{1,2}/\d{2,4}|^\d{4}-\d{1,2}-\d{1,2}|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)', caseSensitive: false).hasMatch(raw);

List<String> _dateValues(Object value) {
  final raw = '$value'.trim();
  DateTime? date;
  if (value is DateTime) {
    date = value;
  } else {
    final slash = RegExp(r'^(\d{1,2})/(\d{1,2})/(\d{2,4})$').firstMatch(raw);
    if (slash != null) {
      var year = int.parse(slash[3]!);
      if (slash[3]!.length == 2) year += 2000;
      final month = int.parse(slash[1]!);
      final day = int.parse(slash[2]!);
      final parsed = DateTime(year, month, day);
      if (parsed.year == year && parsed.month == month && parsed.day == day) date = parsed;
    } else {
      date = DateTime.tryParse(raw);
    }
  }
  if (date == null) return [raw];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const longMonths = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  final month = date.month.toString().padLeft(2, '0');
  final day = date.day.toString().padLeft(2, '0');
  return [raw, '${date.month}/${date.day}/${date.year}',
    '$month/$day/${date.year}', '${date.year}-$month-$day',
    '${months[date.month - 1]} ${date.day}, ${date.year}',
    '${longMonths[date.month - 1]} ${date.day}, ${date.year}'];
}

List<String> collectSearchValues(Object? value, [int depth = 0]) {
  if (value == null || depth > 5) return [];
  if (value is DateTime) return _dateValues(value);
  if (value is String || value is num || value is bool) {
    final raw = '$value';
    return [raw, if (value is String && _potentialDate(raw)) ..._dateValues(value)];
  }
  if (value is Iterable) return value.expand((item) => collectSearchValues(item, depth + 1)).toList();
  if (value is Map) return value.values.expand((item) => collectSearchValues(item, depth + 1)).toList();
  return [];
}

bool matchesSearch(String query, Object? value) {
  final needle = normalizeSearchText(query);
  if (needle.isEmpty) return true;
  final haystack = collectSearchValues(value).map(normalizeSearchText)
      .where((part) => part.isNotEmpty).join(' ');
  return haystack.contains(needle) ||
      compactSearchText(haystack).contains(compactSearchText(needle));
}
