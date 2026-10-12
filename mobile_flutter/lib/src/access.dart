String normalizeRole(Object? role) => '${role ?? ''}'.trim().toLowerCase();

String resolveUserRole(Map<String, dynamic>? user) {
  if (normalizeRole(user?['access']) == 'admin staff') return 'admin staff';
  final job = normalizeRole(user?['jobTitle']);
  return job.isNotEmpty ? job : normalizeRole(user?['access']);
}

String baseLabel(Object? value) => switch ('${value ?? ''}'.toUpperCase()) {
  'MANILA' => 'Manila', 'CEBU' => 'Cebu', 'CDO' => 'Cagayan de Oro', _ => '',
};

const exportAccess = <String, Set<String>>{
  'reports': {'admin staff', 'maintenance manager', 'officer-in-charge'},
  'activityLogs': {'admin staff'},
  'flightLogs': {'admin staff', 'maintenance manager', 'officer-in-charge', 'mechanic', 'pilot'},
  'maintenanceLogs': {'admin staff', 'maintenance manager', 'officer-in-charge', 'mechanic'},
  'preInspection': {'admin staff', 'maintenance manager', 'officer-in-charge', 'mechanic', 'pilot'},
  'postInspection': {'admin staff', 'maintenance manager', 'officer-in-charge', 'mechanic', 'pilot'},
  'partsLifespan': {'admin staff', 'maintenance manager', 'officer-in-charge'},
};

bool canExportModule(String role, String module) =>
    normalizeRole(role) == 'admin staff' ||
    (exportAccess[module]?.contains(normalizeRole(role)) ?? false);
