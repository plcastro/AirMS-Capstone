import 'dart:convert';
import 'auth.dart';

class ViewedLogs {
  ViewedLogs(this.userId, this.module);
  final String userId, module;
  Map<String, dynamic> seen = {};
  String get key => 'airms:viewed-logs:v1:${Uri.encodeComponent(userId)}:$module';

  Future<void> load() async {
    if (userId.isEmpty) return;
    final prefs = await preferences();
    try {
      final value = jsonDecode(prefs.getString(key) ?? '{}');
      if (value is Map) seen = Map<String, dynamic>.from(value);
    } catch (_) { seen = {}; }
  }

  String id(Map<String, dynamic> row) => '${module == 'maintenance' ? (row['sourceTaskId'] ?? row['id'] ?? row['_id'] ?? '') : (row['_id'] ?? row['id'] ?? '')}';
  Map<String, int> stamp(Map<String, dynamic> row) {
    var latest = 0;
    for (final field in ['updatedAt', 'createdAt', 'dateAdded']) {
      final date = DateTime.tryParse('${row[field] ?? ''}');
      if (date != null && date.millisecondsSinceEpoch > latest) latest = date.millisecondsSinceEpoch;
    }
    return {'revision': (row['__v'] is num ? row['__v'] as num : 0).toInt(), 'at': latest};
  }
  bool isNew(Map<String, dynamic> row) {
    final recordId = id(row);
    if (userId.isEmpty || recordId.isEmpty) return false;
    final prior = seen[recordId];
    if (prior is! Map) return true;
    final current = stamp(row);
    return current['revision']! > ((prior['revision'] as num?)?.toInt() ?? 0) ||
      current['at']! > ((prior['at'] as num?)?.toInt() ?? 0);
  }
  Future<void> markViewed(Map<String, dynamic> row) async {
    if (!isNew(row)) return;
    seen[id(row)] = stamp(row);
    final prefs = await preferences();
    await prefs.setString(key, jsonEncode(seen));
  }
}
