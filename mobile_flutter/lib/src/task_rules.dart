String? inspectionConflictMessage(Iterable<Map> tasks, String aircraft,
    String inspection, {String? editingId, bool custom = false}) {
  final name = inspection.trim().toLowerCase();
  final registration = aircraft.trim().toLowerCase();
  if (custom || name.isEmpty || registration.isEmpty) return null;
  for (final task in tasks) {
    if (editingId != null && '${task['_id'] ?? task['id'] ?? ''}' == editingId) continue;
    final status = '${task['status'] ?? ''}'.trim().toLowerCase();
    if (!{'pending', 'ongoing', 'returned'}.contains(status)) continue;
    if ('${task['aircraft'] ?? ''}'.trim().toLowerCase() != registration) continue;
    final titleMatches = '${task['title'] ?? ''}'.trim().toLowerCase() == name;
    final checklist = task['checklistItems'] as List? ?? [];
    final itemMatches = checklist.whereType<Map>().any((item) =>
      '${item['inspectionName'] ?? ''}'.trim().toLowerCase() == name);
    if (titleMatches || itemMatches) {
      return 'This inspection type for this aircraft is ${status == 'ongoing' ? 'ongoing' : 'pending'}.';
    }
  }
  return null;
}

List<Map> rankTaskMechanics(List<Map> mechanics, bool Function(String) qualified) {
  final ranked = [...mechanics];
  String id(Map mechanic) => '${mechanic['id'] ?? mechanic['_id'] ?? ''}';
  int workload(Map mechanic) => (num.tryParse('${mechanic['activeTaskCount'] ?? 0}') ?? 0).toInt().clamp(0, 999999);
  String name(Map mechanic) => '${mechanic['name'] ?? '${mechanic['firstName'] ?? ''} ${mechanic['lastName'] ?? ''}'}'.trim().toLowerCase();
  ranked.sort((a, b) {
    final byQualification = (qualified(id(b)) ? 1 : 0) - (qualified(id(a)) ? 1 : 0);
    if (byQualification != 0) return byQualification;
    final byWorkload = workload(a).compareTo(workload(b));
    if (byWorkload != 0) return byWorkload;
    final byName = name(a).compareTo(name(b));
    return byName != 0 ? byName : id(a).compareTo(id(b));
  });
  return ranked;
}
