import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:airms_flutter/src/viewed_logs.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('new record badges clear after viewing and return on a later revision', () async {
    SharedPreferences.setMockInitialValues({});
    final viewed = ViewedLogs('user-1', 'flight');
    await viewed.load();
    final record = <String, dynamic>{'_id': 'flight-1', '__v': 1, 'updatedAt': '2026-10-12T08:00:00Z'};
    expect(viewed.isNew(record), isTrue);
    await viewed.markViewed(record);
    expect(viewed.isNew(record), isFalse);
    expect(viewed.isNew({...record, '__v': 2}), isTrue);
    final restored = ViewedLogs('user-1', 'flight');
    await restored.load();
    expect(restored.isNew(record), isFalse);
    final otherUser = ViewedLogs('user-2', 'flight');
    await otherUser.load();
    expect(otherUser.isNew(record), isTrue);
  });
}
