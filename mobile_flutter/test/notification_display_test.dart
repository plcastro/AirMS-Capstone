import 'package:flutter_test/flutter_test.dart';
import 'package:airms_flutter/src/notification_display.dart';

void main() {
  test('read state accepts server flag and per-user readBy', () {
    expect(notificationIsRead({'read': true}, 'a'), isTrue);
    expect(notificationIsRead({'readBy': [{'id': 'a'}]}, 'a'), isTrue);
    expect(notificationIsRead({'read': false, 'readBy': []}, 'a'), isFalse);
  });
  test('notification time labels follow React Native', () {
    final now = DateTime(2026, 10, 12, 12);
    expect(notificationTimeAgo('2026-10-12T11:59:40', now: now), 'Just now');
    expect(notificationTimeAgo('2026-10-12T11:30:00', now: now), '30 min ago');
    expect(notificationTimeAgo('2026-10-12T10:00:00', now: now), '2 hr ago');
  });
  test('message notification removes duplicate preview from title', () {
    final display = notificationDisplay({
      'module': 'messages', 'title': 'Alex: Ready for dispatch',
      'description': 'Ready for dispatch',
    });
    expect(display.title, 'Alex');
    expect(display.description, 'Ready for dispatch');
    expect(notificationDisplay({'module': 'tasks', 'title': 'Alex: Ready for dispatch',
      'description': 'Ready for dispatch'}).title, 'Alex: Ready for dispatch');
  });
}
