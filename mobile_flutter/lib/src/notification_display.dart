const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

bool notificationIsRead(Map notification, String userId) {
  if (notification['read'] == true) return true;
  return (notification['readBy'] as List? ?? []).any((reader) =>
    '$reader' == userId || reader is Map &&
      '${reader['_id'] ?? reader['id']}' == userId);
}

String notificationTimeAgo(Object? value, {DateTime? now}) {
  final date = DateTime.tryParse('${value ?? ''}')?.toLocal();
  if (date == null) return '';
  final elapsed = (now ?? DateTime.now()).difference(date).inSeconds;
  if (elapsed < 60) return 'Just now';
  if (elapsed < 3600) return '${elapsed ~/ 60} min ago';
  if (elapsed < 86400) return '${elapsed ~/ 3600} hr ago';
  final hour = date.hour % 12 == 0 ? 12 : date.hour % 12;
  return '${_months[date.month - 1]} ${date.day}, $hour:${date.minute.toString().padLeft(2, '0')} ${date.hour < 12 ? 'AM' : 'PM'}';
}

({String title, String description}) notificationDisplay(Map notification) {
  final title = '${notification['title'] ?? ''}';
  final description = '${notification['description'] ?? ''}';
  if ('${notification['module'] ?? ''}' == 'messages') {
    final separator = title.indexOf(': ');
    if (separator > 0 && title.substring(separator + 2).trim() == description.trim()) {
      return (title: title.substring(0, separator).trim(), description: description);
    }
  }
  return (title: title, description: description);
}
