const inspectionPageSize = 10;

Set<String> setInspectionChecks(Iterable<String> keys, Set<String> current,
    Set<String> flagged, bool value) {
  final next = {...current};
  for (final key in keys) {
    if (flagged.contains(key)) continue;
    if (value) { next.add(key); } else { next.remove(key); }
  }
  return next;
}

bool canSignInspection(int itemCount, Set<String> checked,
    Set<String> flagged, {bool held = false, String resolution = ''}) =>
  itemCount > 0 && checked.length == itemCount && flagged.isEmpty &&
  (!held || resolution.trim().isNotEmpty);
