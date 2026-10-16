import 'dart:math' as math;
import 'dart:async';
import 'package:flutter/material.dart';
import 'search.dart';
import 'auth.dart';
import 'flight_logs.dart';
import 'file_exports.dart';
import 'pdf_exports.dart';
import 'access.dart';

const reportSources = <String, String>{
  'Tasks': '/api/tasks/getAll',
  'Parts Monitoring': '/api/parts-monitoring?page=1&limit=1000',
  'Flight Logs': '/api/flightlogs?page=1&limit=500&sortBy=date&sortOrder=desc',
  'Pre-Flight Inspections': '/api/pre-flight/getAllPreInspection',
  'Post-Flight Inspections': '/api/post-flight/getAllPostInspection',
  'Parts Requisitions': '/api/parts-requisition/get-all-requisition',
};

Map<String, int> reportCounts(
  List<Map<String, dynamic>> rows,
  String Function(Map<String, dynamic>) label, {
  int limit = 0,
}) {
  final result = <String, int>{};
  for (final row in rows) {
    final value = label(row).trim();
    final normalized = value
        .replaceAll(RegExp(r'[_-]+'), ' ')
        .trim()
        .toLowerCase();
    if ({
      '',
      'unknown',
      'n/a',
      'na',
      'unassigned',
      'all',
      'overall',
      'total',
      'totals',
    }.contains(normalized)) {
      continue;
    }
    result.update(value, (count) => count + 1, ifAbsent: () => 1);
  }
  final order = {
    for (var i = 0; i < result.length; i++) result.keys.elementAt(i): i,
  };
  final entries = result.entries.toList()
    ..sort((a, b) {
      final count = b.value.compareTo(a.value);
      return count == 0 ? order[a.key]!.compareTo(order[b.key]!) : count;
    });
  return {
    for (final entry in limit > 0 ? entries.take(limit) : entries)
      entry.key: entry.value,
  };
}

Map<String, int> reportHistoryCounts(List<Map<String, dynamic>> tasks) {
  final counts = <String, int>{};
  for (final task in tasks) {
    final status = flightText(
      reportFirstValue([task['status']], 'Unknown'),
    ).replaceAll('_', ' ').trim();
    final label = status.isEmpty ? 'Unknown' : status;
    if (const {
      'all',
      'overall',
      'total',
      'totals',
    }.contains(label.replaceAll(RegExp(r'[_-]+'), ' ').trim().toLowerCase())) {
      continue;
    }
    counts.update(label, (value) => value + 1, ifAbsent: () => 1);
  }
  final order = {
    for (var i = 0; i < counts.length; i++) counts.keys.elementAt(i): i,
  };
  return Map.fromEntries(
    counts.entries.toList()..sort((a, b) {
      final count = b.value.compareTo(a.value);
      return count == 0 ? order[a.key]!.compareTo(order[b.key]!) : count;
    }),
  );
}

List<Color> reportModuleColors(
  List<Map<String, dynamic>> rows,
  String Function(Map<String, dynamic>) label,
  Iterable<String> sortedLabels,
) {
  final firstSeen = <String, Color>{};
  for (final row in rows) {
    final value = label(row).trim();
    final normalized = value.replaceAll(RegExp(r'[_-]+'), ' ').toLowerCase();
    if (const {
      '',
      'unknown',
      'n/a',
      'na',
      'unassigned',
      'all',
      'overall',
      'total',
      'totals',
    }.contains(normalized)) {
      continue;
    }
    firstSeen.putIfAbsent(
      value,
      () => ReportDonut.palette[firstSeen.length % ReportDonut.palette.length],
    );
  }
  return sortedLabels
      .map((value) => firstSeen[value] ?? ReportDonut.palette.first)
      .toList();
}

String _reportBase(dynamic value) => flightText(value).trim().toUpperCase();
dynamic reportFirstValue(Iterable<dynamic> values, [dynamic fallback]) {
  for (final value in values) {
    if (value != null &&
        value != false &&
        value != 0 &&
        (value is! String || value.isNotEmpty)) {
      return value;
    }
  }
  return fallback;
}

String reportDate(dynamic value) {
  final date = DateTime.tryParse(flightText(value))?.toLocal();
  if (date == null) return 'N/A';
  return '${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}/${date.year}';
}

String reportFileName(String extension, [DateTime? now]) {
  final date = (now ?? DateTime.now()).toLocal();
  return 'ReportsAndAnalytics_${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}.$extension';
}

String reportExecutorName(Map<String, dynamic>? user) {
  final fullName = [user?['firstName'], user?['lastName']]
      .map((part) => flightText(part).trim())
      .where((part) => part.isNotEmpty)
      .join(' ');
  if (fullName.isNotEmpty) return fullName;
  for (final part in [
    user?['displayName'],
    user?['username'],
    user?['email'],
  ]) {
    final value = flightText(part).trim();
    if (value.isNotEmpty) return value;
  }
  return 'Unknown User';
}

num? _partNumber(Map<String, dynamic> part, String key) {
  if (!part.containsKey(key)) return null;
  final value = part[key];
  if (value == null || flightText(value).trim().isEmpty) return 0;
  if (value is bool) return value ? 1 : 0;
  return num.tryParse(flightText(value));
}

bool _knownReportBase(dynamic value) =>
    !{'', 'UNKNOWN', 'N/A', 'NA', 'UNASSIGNED'}.contains(_reportBase(value));
bool _reportCompleted(Map<String, dynamic> task) {
  final status = flightText(task['status']).trim().toLowerCase();
  return {'completed', 'turned in', 'approved'}.contains(status) ||
      task['isApproved'] == true ||
      reportFirstValue([task['completedAt']]) != null;
}

String reportTaskBucket(Map<String, dynamic> task, DateTime now) {
  if (_reportCompleted(task)) return 'completed';
  final due = DateTime.tryParse(
    flightText(
      reportFirstValue([
        task['dueDate'],
        task['endDateTime'],
        task['dateRectified'],
      ]),
    ),
  );
  if (due == null) return 'other';
  final localDue = due.toLocal();
  final dueDay = DateTime(localDue.year, localDue.month, localDue.day);
  final today = DateTime(now.year, now.month, now.day);
  if (dueDay.isBefore(today)) return 'overdue';
  if (!dueDay.isAfter(today.add(const Duration(days: 3)))) return 'dueSoon';
  return 'other';
}

bool _reportTaskMentions(Map<String, dynamic> task, List<String> words) {
  final details = [
    task['status'],
    task['title'],
    task['findings'],
    task['defects'],
    task['maintenanceType'],
    flightMap(task['summary'])['remarks'],
  ].map(flightText).join(' ').toLowerCase();
  return words.any(details.contains);
}

class ReportCardData {
  const ReportCardData(
    this.title,
    this.category,
    this.keywords,
    this.records,
    this.builder,
    this.matchCount,
  );
  final String title, category;
  final List<String> keywords;
  final List<Map<String, dynamic>> records;
  final Widget Function() builder;
  final int matchCount;
}

List<ReportCardData> rankReportCards(
  List<ReportCardData> cards,
  String search,
) {
  final query = search.trim().toLowerCase();
  if (query.isEmpty) return cards;
  final tokens = query
      .split(RegExp(r'[\s\-_/]+'))
      .where((part) => part.isNotEmpty);
  final scored = <(ReportCardData, int)>[];
  for (final card in cards) {
    final haystack = [
      card.title,
      card.category,
      ...card.keywords,
    ].join(' ').toLowerCase();
    var relevance = tokens.where(haystack.contains).length;
    if (haystack.contains(query)) relevance += 2;
    if (matchesSearch(query, card.records)) relevance += 2;
    relevance += math.min(card.matchCount, 10);
    if (relevance > 0) scored.add((card, relevance));
  }
  scored.sort((a, b) {
    final score = b.$2.compareTo(a.$2);
    return score == 0 ? a.$1.title.compareTo(b.$1.title) : score;
  });
  return scored.map((entry) => entry.$1).toList();
}

List<Map<String, dynamic>> _reportBaseRows(
  Map<String, dynamic> analytics,
  List<Map<String, dynamic>> tasks,
  Map<String, String> aircraftBases,
  String search,
) {
  final serverRows = (analytics['byBase'] as List? ?? [])
      .map(flightMap)
      .where((row) => _knownReportBase(row['base']))
      .toList();
  if (search.trim().isEmpty && serverRows.isNotEmpty) return serverRows;
  final counts = <String, List<int>>{};
  for (final task in tasks) {
    final base = [
      task['base'],
      task['locationBase'],
      task['assignedBase'],
      task['stationBase'],
      aircraftBases[_reportBase(task['aircraft'])],
    ].map(_reportBase).firstWhere(_knownReportBase, orElse: () => '');
    if (base.isEmpty) continue;
    final count = counts.putIfAbsent(base, () => [0, 0]);
    if (_reportTaskMentions(task, const [
      'damage',
      'damaged',
      'defect',
      'crack',
      'fault',
      'issue',
    ])) {
      count[0]++;
    }
    if (_reportCompleted(task) ||
        _reportTaskMentions(task, const [
          'repair',
          'repaired',
          'rectified',
          'fixed',
          'resolved',
        ])) {
      count[1]++;
    }
  }
  final rows = counts.entries
      .map(
        (entry) => <String, dynamic>{
          'base': entry.key,
          'damagedCount': entry.value[0],
          'repairedCount': entry.value[1],
        },
      )
      .toList();
  return rows;
}

List<Map<String, dynamic>> _baseMetricRows(
  List<Map<String, dynamic>> rows,
  String key, {
  required bool serverData,
}) {
  final result =
      rows.where((row) => serverData || (row[key] as num? ?? 0) > 0).toList()
        ..sort((a, b) => (b[key] as num? ?? 0).compareTo(a[key] as num? ?? 0));
  return serverData ? result : result.take(10).toList();
}

num _firstBaseMetric(List<Map<String, dynamic>> rows, String base, String key) {
  for (final row in rows) {
    if (row['base'] == base) return row[key] as num? ?? 0;
  }
  return 0;
}

class _ReportPanel extends StatelessWidget {
  const _ReportPanel(this.title, this.subtitle, this.child, {this.right});
  final String title, subtitle;
  final Widget child;
  final Widget? right;
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 10),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(8),
      border: Border.all(color: const Color(0xffe4e4e4)),
    ),
    child: Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Color(0xff244d3b),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.only(top: 3),
                      child: Text(
                        subtitle,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xff5c5c5c),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              ?right,
            ],
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    ),
  );
}

class ReportsPage extends StatefulWidget {
  const ReportsPage({super.key, required this.session});
  final AirmsSession session;
  @override
  State<ReportsPage> createState() => _ReportsPageState();
}

class _ReportsPageState extends State<ReportsPage> {
  final data = <String, List<Map<String, dynamic>>>{};
  Map<String, dynamic> baseAnalytics = {};
  Map<String, String> aircraftBases = {};
  String search = '';
  String taskKpi = 'dueSoon';
  String activeKpi = 'dueSoon';
  String fileType = 'PDF';
  final searchController = TextEditingController();
  Timer? searchTimer;
  String searchDraft = '';
  bool loading = true;
  bool exporting = false;
  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void dispose() {
    searchTimer?.cancel();
    searchController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _arrayData(dynamic payload) {
    if (payload is List) return payload.map(flightMap).toList();
    if (payload is! Map) return [];
    for (final value in [
      payload['data'],
      payload['records'],
      payload['items'],
      flightMap(payload['data'])['records'],
      flightMap(payload['data'])['items'],
      flightMap(payload['data'])['data'],
    ]) {
      if (value is List) return value.map(flightMap).toList();
    }
    return [];
  }

  Future<void> load() async {
    setState(() => loading = true);
    final results = await Future.wait(
      reportSources.entries.map((entry) async {
        try {
          final response = await widget.session.request(entry.value);
          return MapEntry(entry.key, _arrayData(response));
        } catch (_) {
          return MapEntry(entry.key, <Map<String, dynamic>>[]);
        }
      }),
    );
    Map<String, dynamic> analytics = {};
    try {
      final response = await widget.session.request(
        '/api/tasks/analytics/base-maintenance',
      );
      analytics = flightMap(response['data']);
    } catch (_) {}
    final bases = <String, String>{};
    try {
      final response = await widget.session.request(
        '/api/aircraft/aircraft-with-bases',
      );
      for (final row in _arrayData(response)) {
        final tail = _reportBase(
          reportFirstValue([row['tailNum'], row['aircraft']]),
        );
        final base = _reportBase(row['base']);
        if (tail.isNotEmpty && _knownReportBase(base)) bases[tail] = base;
      }
    } catch (_) {}
    if (mounted) {
      setState(() {
        data
          ..clear()
          ..addEntries(results);
        baseAnalytics = analytics;
        aircraftBases = bases;
        loading = false;
      });
    }
  }

  List<Map<String, dynamic>> reportSections() {
    final query = search.trim().toLowerCase();
    List<Map<String, dynamic>> rows(String key) =>
        (data[key] ?? []).where((row) => matchesSearch(query, row)).toList();
    Map<String, int> counts(
      List<Map<String, dynamic>> source,
      String Function(Map<String, dynamic>) label,
    ) {
      final result = <String, int>{};
      for (final row in source) {
        final key = label(row).trim();
        result.update(
          key.isEmpty ? 'Unknown' : key,
          (value) => value + 1,
          ifAbsent: () => 1,
        );
      }
      return Map.fromEntries(
        result.entries.toList()..sort((a, b) => b.value.compareTo(a.value)),
      );
    }

    Map<String, dynamic> countSection(
      String title,
      Map<String, int> values,
    ) => {
      'title': title,
      'columns': ['Metric', 'Value'],
      'rows': values.entries.map((entry) => [entry.key, entry.value]).toList(),
    };
    final tasks = rows('Tasks');
    final flights = rows('Flight Logs');
    final pre = rows('Pre-Flight Inspections');
    final post = rows('Post-Flight Inspections');
    final requisitions = rows('Parts Requisitions');
    final monitored = rows('Parts Monitoring');
    final components = <Map<String, dynamic>>[];
    for (final aircraft in monitored) {
      for (final part in aircraft['parts'] as List? ?? []) {
        final item = flightMap(part);
        if (item['rowType'] == 'header' ||
            flightText(item['componentName']).isEmpty) {
          continue;
        }
        components.add({
          ...item,
          'aircraft': reportFirstValue([aircraft['aircraft']], 'Unknown'),
        });
      }
    }
    final dueComponents = components.where((part) {
      final days = _partNumber(part, 'daysRemaining');
      final hours = _partNumber(part, 'timeRemaining');
      return flightText(part['due']).toLowerCase().contains('due') ||
          (days != null && days <= 30) ||
          (hours != null && hours <= 50);
    }).toList();
    final bases = _reportBaseRows(baseAnalytics, tasks, aircraftBases, query);
    final serverData =
        query.isEmpty &&
        (baseAnalytics['byBase'] as List? ?? [])
            .map(flightMap)
            .any((row) => _knownReportBase(row['base']));
    final damageRows = _baseMetricRows(
      bases,
      'damagedCount',
      serverData: serverData,
    );
    final repairRows = _baseMetricRows(
      bases,
      'repairedCount',
      serverData: serverData,
    );
    final baseNames = <String>{
      ...damageRows.map((row) => flightText(row['base'])),
      ...repairRows.map((row) => flightText(row['base'])),
    };
    final now = DateTime.now();
    final dueSoon = tasks
        .where((task) => reportTaskBucket(task, now) == 'dueSoon')
        .length;
    final overdue = tasks
        .where((task) => reportTaskBucket(task, now) == 'overdue')
        .length;
    final requisitionItems = requisitions
        .expand((record) => (record['items'] as List? ?? []).map(flightMap))
        .toList();
    String month(Map<String, dynamic> row) {
      final date = DateTime.tryParse(
        flightText(
          reportFirstValue([
            row['date'],
            row['dateRequested'],
            row['dateAdded'],
            row['createdAt'],
            row['updatedAt'],
          ]),
        ),
      )?.toLocal();
      if (date == null) return 'No date';
      const names = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      return '${names[date.month - 1]} ${date.year}';
    }

    return [
      {
        'title': 'Overview Statistics',
        'columns': ['Metric', 'Value'],
        'rows': [
          ['Total Tasks', tasks.length],
          ['Completed Tasks', tasks.where(_reportCompleted).length],
          ['Due Soon Tasks', dueSoon],
          ['Overdue Tasks', overdue],
          ['Parts Monitoring Aircraft', monitored.length],
          ['Tracked Components', components.length],
          ['Due / Due Soon Components', dueComponents.length],
          ['Flight Logs', flights.length],
          ['Pre-Flight Inspections', pre.length],
          ['Post-Flight Inspections', post.length],
          ['Parts Requisitions', requisitions.length],
          ['Requested Line Items', requisitionItems.length],
        ],
      },
      {
        'title': 'Base Damage and Repair Counts',
        'columns': ['Base', 'Damage Reports', 'Repaired Aircraft'],
        'rows': baseNames
            .map(
              (base) => [
                base,
                _firstBaseMetric(damageRows, base, 'damagedCount'),
                _firstBaseMetric(repairRows, base, 'repairedCount'),
              ],
            )
            .toList(),
      },
      countSection(
        'Task Status Counts',
        counts(tasks, (row) => flightText(row['status']).replaceAll('_', ' ')),
      ),
      countSection(
        'Task Priority Counts',
        counts(
          tasks,
          (row) => flightText(row['priority']).isEmpty
              ? 'Normal'
              : flightText(row['priority']),
        ),
      ),
      countSection(
        'Tasks by Aircraft',
        counts(tasks, (row) => flightText(row['aircraft'])),
      ),
      {
        'title': 'Task Details',
        'columns': [
          'Aircraft',
          'Task',
          'Assigned Mechanic',
          'Type',
          'Due Date',
          'Completed Date',
          'Priority',
          'Status',
        ],
        'rows': tasks
            .map(
              (task) => [
                reportFirstValue([task['aircraft']], 'N/A'),
                reportFirstValue([
                  task['title'],
                  flightMap(task['summary'])['category'],
                ], 'Untitled task'),
                reportFirstValue([
                  task['assignedToName'],
                  task['assignedMechanic'],
                ], 'Unassigned'),
                reportFirstValue([task['maintenanceType']], 'N/A'),
                reportDate(
                  reportFirstValue([
                    task['dueDate'],
                    task['endDateTime'],
                    task['dateRectified'],
                  ]),
                ),
                reportDate(
                  reportFirstValue([
                    task['approvedAt'],
                    task['completedAt'],
                    task['dateRectified'],
                    task['updatedAt'],
                  ]),
                ),
                reportFirstValue([task['priority']], 'Normal'),
                reportFirstValue([task['status']], 'Pending'),
              ],
            )
            .toList(),
      },
      countSection(
        'Flight Logs by Aircraft',
        reportCounts(
          flights,
          (row) => flightText(reportFirstValue([row['rpc'], row['aircraft']])),
        ),
      ),
      countSection(
        'Flight Log Status Counts',
        reportCounts(
          flights,
          (row) => flightText(row['status']).replaceAll('_', ' '),
        ),
      ),
      countSection('Flight Logs by Month', reportCounts(flights, month)),
      countSection(
        'Pre-Flight Inspection Status Counts',
        reportCounts(
          pre,
          (row) => flightText(row['status']).replaceAll('_', ' '),
        ),
      ),
      countSection(
        'Post-Flight Inspection Status Counts',
        reportCounts(
          post,
          (row) => flightText(row['status']).replaceAll('_', ' '),
        ),
      ),
      countSection(
        'Parts Requisition Status Counts',
        reportCounts(
          requisitions,
          (row) => flightText(row['status']).replaceAll('_', ' '),
        ),
      ),
      countSection(
        'Parts Requisition Item Stock Counts',
        counts(
          requisitionItems,
          (row) => flightText(row['stockStatus']).replaceAll('_', ' '),
        ),
      ),
      countSection(
        'Component Due Statistics',
        counts(dueComponents, (row) => flightText(row['aircraft'])),
      ),
    ];
  }

  Future<void> exportExcel() async {
    setState(() => exporting = true);
    try {
      await openAuthenticatedExport(
        widget.session,
        '/api/reports/export-excel',
        reportFileName('xlsx'),
        method: 'POST',
        body: {'title': 'Reports and Analytics', 'sections': reportSections()},
      );
    } catch (e) {
      _showExportError(e);
    } finally {
      if (mounted) setState(() => exporting = false);
    }
  }

  Future<void> exportPdf() async {
    setState(() => exporting = true);
    try {
      final sections = reportSections();
      final overview = (sections.first['rows'] as List)
          .whereType<List>()
          .toList();
      String metric(String label) => flightText(
        overview
            .firstWhere(
              (row) => row.isNotEmpty && row.first == label,
              orElse: () => [label, 0],
            )
            .elementAt(1),
      );
      final baseRows = (sections[1]['rows'] as List).whereType<List>().toList();
      List<Map<String, dynamic>> chartRows(String title) {
        final section = sections.firstWhere(
          (item) => item['title'] == title,
          orElse: () => <String, dynamic>{'rows': <dynamic>[]},
        );
        return (section['rows'] as List)
            .whereType<List>()
            .map(
              (row) => <String, dynamic>{
                'label': row.isNotEmpty ? row[0] : '',
                'value': row.length > 1 ? row[1] : 0,
              },
            )
            .toList();
      }

      await shareAirmsAnalyticsPdf(
        title: 'Reports and Analytics',
        fileName: reportFileName('pdf'),
        executedBy: reportExecutorName(widget.session.user),
        sections: sections,
        summaryCards: [
          {'label': 'Completed Tasks', 'value': metric('Completed Tasks')},
          {'label': 'Due Soon Tasks', 'value': metric('Due Soon Tasks')},
          {'label': 'Overdue Tasks', 'value': metric('Overdue Tasks')},
          {
            'label': 'Top Damage Base',
            'value': baseRows.isEmpty
                ? 'N/A (0)'
                : '${baseRows.reduce((a, b) => (num.tryParse('${a[1]}') ?? 0) >= (num.tryParse('${b[1]}') ?? 0) ? a : b)[0]} '
                      '(${baseRows.map((row) => num.tryParse('${row[1]}') ?? 0).reduce((a, b) => a > b ? a : b)})',
          },
          {
            'label': 'Top Repaired Base',
            'value': baseRows.isEmpty
                ? 'N/A (0)'
                : '${baseRows.reduce((a, b) => (num.tryParse('${a[2]}') ?? 0) >= (num.tryParse('${b[2]}') ?? 0) ? a : b)[0]} '
                      '(${baseRows.map((row) => num.tryParse('${row[2]}') ?? 0).reduce((a, b) => a > b ? a : b)})',
          },
        ],
        barCharts: [
          {
            'title': 'Task Status Distribution',
            'rows': chartRows('Task Status Counts'),
          },
          {
            'title': 'Base Damage Reports',
            'rows': [
              for (final row
                  in ([...baseRows]..sort(
                    (a, b) => (num.tryParse('${b[1]}') ?? 0).compareTo(
                      num.tryParse('${a[1]}') ?? 0,
                    ),
                  )))
                {'label': row[0], 'value': row[1]},
            ],
          },
          {
            'title': 'Base Repaired Aircraft',
            'rows': [
              for (final row
                  in ([...baseRows]..sort(
                    (a, b) => (num.tryParse('${b[2]}') ?? 0).compareTo(
                      num.tryParse('${a[2]}') ?? 0,
                    ),
                  )))
                {'label': row[0], 'value': row[2]},
            ],
          },
        ],
      );
    } catch (e) {
      _showExportError(e);
    } finally {
      if (mounted) setState(() => exporting = false);
    }
  }

  void _showExportError(Object error) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$error'.trim().isEmpty ? 'Export failed.' : '$error'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final query = search.trim().toLowerCase();
    final searching = query.isNotEmpty;
    List<Map<String, dynamic>> filtered(String key) =>
        (data[key] ?? []).where((row) => matchesSearch(query, row)).toList();
    final tasks = filtered('Tasks');
    final flights = filtered('Flight Logs');
    final pre = filtered('Pre-Flight Inspections');
    final post = filtered('Post-Flight Inspections');
    final requisitions = filtered('Parts Requisitions');
    final parts = filtered('Parts Monitoring');
    final now = DateTime.now();
    final completed = tasks.where(_reportCompleted).length;
    final dueSoon = tasks
        .where((row) => reportTaskBucket(row, now) == 'dueSoon')
        .length;
    final overdue = tasks
        .where((row) => reportTaskBucket(row, now) == 'overdue')
        .length;
    final drilldown =
        tasks.where((row) => reportTaskBucket(row, now) == taskKpi).toList()
          ..sort((a, b) {
            DateTime? due(Map<String, dynamic> row) => DateTime.tryParse(
              flightText(
                row['dueDate'] ?? row['endDateTime'] ?? row['dateRectified'],
              ),
            );
            return (due(a) ?? DateTime(9999)).compareTo(
              due(b) ?? DateTime(9999),
            );
          });
    final bases = _reportBaseRows(baseAnalytics, tasks, aircraftBases, query);
    final serverData =
        query.isEmpty &&
        (baseAnalytics['byBase'] as List? ?? [])
            .map(flightMap)
            .any((row) => _knownReportBase(row['base']));
    final damage = _baseMetricRows(
      bases,
      'damagedCount',
      serverData: serverData,
    );
    final repairs = _baseMetricRows(
      bases,
      'repairedCount',
      serverData: serverData,
    );
    bool done(Map<String, dynamic> row) => const [
      'completed',
      'approved',
      'released',
      'accepted',
      'done',
    ].any((word) => flightText(row['status']).toLowerCase().contains(word));
    final modules = <(String, List<Map<String, dynamic>>)>[
      ('Task Assignment', tasks),
      ('Flight Log', flights),
      ('Pre-Inspection', pre),
      ('Post-Inspection', post),
      ('Parts Requisition', requisitions),
    ];
    final allRecords = modules.fold<int>(0, (sum, row) => sum + row.$2.length);
    final allDone = modules.fold<int>(
      0,
      (sum, row) => sum + row.$2.where(done).length,
    );
    final trend = <DateTime?, int>{};
    for (final task in tasks) {
      final date = DateTime.tryParse(
        flightText(task['updatedAt'] ?? task['createdAt'] ?? task['dueDate']),
      )?.toLocal();
      final month = date == null ? null : DateTime(date.year, date.month);
      trend.update(month, (value) => value + 1, ifAbsent: () => 1);
    }
    final trendEntries = trend.entries.toList()
      ..sort(
        (a, b) => (a.key ?? DateTime(9999)).compareTo(b.key ?? DateTime(9999)),
      );
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final trendPoints = trendEntries.reversed
        .take(8)
        .toList()
        .reversed
        .map(
          (entry) => MapEntry(
            entry.key == null
                ? 'No date'
                : '${months[entry.key!.month - 1]} ${entry.key!.year}',
            entry.value,
          ),
        )
        .toList();
    final componentCounts = <String, int>{};
    for (final record in parts) {
      final aircraft = flightText(record['aircraft']).isEmpty
          ? 'Unknown'
          : flightText(record['aircraft']);
      final count = (record['parts'] as List? ?? [])
          .where(
            (part) =>
                part is Map &&
                part['rowType'] != 'header' &&
                flightText(part['componentName']).isNotEmpty,
          )
          .length;
      componentCounts.update(
        aircraft,
        (value) => value + count,
        ifAbsent: () => count,
      );
    }
    final components = componentCounts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    Widget detail(String label, String value) => SizedBox(
      width: 145,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(color: Colors.black54, fontSize: 11),
          ),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
          ),
        ],
      ),
    );
    final cards = <ReportCardData>[];
    void add(
      String title,
      String category,
      List<String> keywords,
      List<Map<String, dynamic>> records,
      Widget Function() builder,
      int matches,
    ) => cards.add(
      ReportCardData(title, category, keywords, records, builder, matches),
    );
    add(
      'General Reports',
      'Performance',
      ['general', 'reports', 'overview', 'cross-module'],
      [
        ...?data['Tasks'],
        ...?data['Flight Logs'],
        ...?data['Pre-Flight Inspections'],
        ...?data['Post-Flight Inspections'],
        ...?data['Parts Requisitions'],
      ],
      () => _ReportPanel(
        'General Reports',
        loading ? 'Loading general summary...' : 'Cross-module overview',
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                detail('All Records', allRecords.toString()),
                detail('Completed / Closed', allDone.toString()),
                detail('Open / Pending', (allRecords - allDone).toString()),
              ],
            ),
            const SizedBox(height: 8),
            for (final row in modules)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(10),
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      detail('Module', row.$1),
                      detail('Total', row.$2.length.toString()),
                      detail('Completed', row.$2.where(done).length.toString()),
                      detail(
                        'Completion',
                        '${(row.$2.isEmpty
                                    ? 0
                                    : (row.$2.where(done).length /
                                              row.$2.length *
                                              100)
                                          .round())
                                .toString()}%',
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
      allRecords,
    );
    add(
      'Performance Overview',
      'Performance',
      ['performance', 'overview'],
      data['Tasks'] ?? [],
      () => _ReportPanel(
        'Performance Overview',
        'Task trend and throughput',
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 8,
              children: [
                detail('Total Tasks', tasks.length.toString()),
                detail(
                  'Completed',
                  tasks
                      .where(
                        (row) => flightText(
                          row['status'],
                        ).toLowerCase().contains('complete'),
                      )
                      .length
                      .toString(),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ReportArea(
              trendPoints,
              color: const Color(0xff26866f),
              legend: 'Task Activity',
            ),
            const Text(
              'Repair frequency trend based on available records.',
              style: TextStyle(fontSize: 11, color: Colors.black54),
            ),
            const Text(
              'Displays count of task activity over recent months.',
              style: TextStyle(fontSize: 11, color: Colors.black54),
            ),
          ],
        ),
      ),
      tasks.length,
    );
    add(
      'Maintenance History',
      'Performance',
      ['history', 'maintenance', 'record'],
      data['Tasks'] ?? [],
      () => _ReportPanel(
        'Maintenance History',
        loading
            ? 'Loading task history...'
            : 'Status distribution of maintenance tasks',
        ReportDonut(
          size: 180,
          values: reportHistoryCounts(tasks),
          fitToWidth: true,
          emptyText: 'No maintenance history data available',
        ),
      ),
      tasks.length,
    );
    final repaired = tasks
        .where(
          (row) => const ['repair', 'complete'].any(
            (word) => flightText(row['status']).toLowerCase().contains(word),
          ),
        )
        .length;
    final pending = tasks
        .where(
          (row) =>
              !flightText(row['status']).toLowerCase().contains('complete'),
        )
        .length;
    final insightOverdue = tasks.where((row) {
      final due = DateTime.tryParse(
        flightText(
          row['dueDate'] ?? row['endDateTime'] ?? row['dateRectified'],
        ),
      );
      return due != null && due.isBefore(now);
    }).length;
    final insights = {
      'Repaired/Completed': repaired,
      'Pending': pending,
      'Overdue': insightOverdue,
    };
    add(
      'Maintenance Insights',
      'Performance',
      ['summary', 'insights', 'repair'],
      data['Tasks'] ?? [],
      () => _ReportPanel(
        'Maintenance Insights',
        loading ? 'Loading summary...' : 'High-level health indicators',
        Column(
          children: [
            Wrap(
              spacing: 8,
              children: [
                for (final entry in insights.entries)
                  detail(entry.key, entry.value.toString()),
              ],
            ),
            ReportDonut(
              values: insights,
              showEmptySlice: true,
              colors: const [
                Color(0xff26866f),
                Color(0xfffaad14),
                Color(0xfff5222d),
              ],
            ),
          ],
        ),
      ),
      tasks.length,
    );
    add(
      'Component Analysis',
      'Inventory',
      ['component', 'usage', 'analysis'],
      data['Parts Monitoring'] ?? [],
      () => _ReportPanel(
        'Component Analysis',
        loading
            ? 'Loading components...'
            : 'Tracked component counts by aircraft',
        ReportArea(
          components.take(8).toList(),
          color: const Color(0xff1890ff),
          legend: 'Components',
        ),
      ),
      parts.length,
    );
    void distribution(
      String title,
      String category,
      List<String> keywords,
      String source,
      String subtitle,
      String empty,
      String Function(Map<String, dynamic>) label, {
      bool fitToWidth = false,
    }) {
      final rows = filtered(source);
      final counts = reportCounts(rows, label, limit: 6);
      add(
        title,
        category,
        keywords,
        data[source] ?? [],
        () => _ReportPanel(
          title,
          loading ? 'Loading records...' : subtitle,
          ReportDonut(
            size: 190,
            values: counts,
            colors: reportModuleColors(rows, label, counts.keys),
            emptyText: empty,
            fitToWidth: fitToWidth,
          ),
        ),
        rows.length,
      );
    }

    distribution(
      'Flight Log Report',
      'Logbook',
      ['flight', 'log', 'aircraft', 'release'],
      'Flight Logs',
      'Flight logs by aircraft',
      'No flight log data available',
      (row) => flightText(reportFirstValue([row['rpc'], row['aircraft']])),
      fitToWidth: true,
    );
    distribution(
      'Pre-Inspection Report',
      'Logbook',
      ['pre', 'inspection', 'pre-flight inspection', 'aircraft'],
      'Pre-Flight Inspections',
      'Inspection status distribution',
      'No inspection data available',
      (row) => flightText(row['status']).replaceAll('_', ' '),
    );
    distribution(
      'Post-Inspection Report',
      'Logbook',
      ['post', 'inspection', 'post-inspection', 'aircraft'],
      'Post-Flight Inspections',
      'Inspection status distribution',
      'No inspection data available',
      (row) => flightText(row['status']).replaceAll('_', ' '),
    );
    distribution(
      'Parts Requisition Report',
      'Inventory',
      ['parts', 'requisition', 'warehouse', 'wrs', 'stock'],
      'Parts Requisitions',
      'Request status distribution',
      'No parts requisition data available',
      (row) => flightText(row['status']).replaceAll('_', ' '),
      fitToWidth: true,
    );
    final ranked = rankReportCards(cards, query);
    final topMatch = searching && ranked.isNotEmpty ? ranked.first : null;
    final grouped = <String, List<ReportCardData>>{};
    for (final category in const ['Performance', 'Inventory', 'Logbook']) {
      final items = ranked
          .where((card) => card.category == category && card != topMatch)
          .toList();
      if (items.isNotEmpty) grouped[category] = items;
    }
    Widget baseChart(
      String title,
      String key,
      List<Map<String, dynamic>> rows,
      String active,
    ) => InkWell(
      onTap: () => setState(() => activeKpi = active),
      child: _ReportPanel(
        title,
        rows.isEmpty
            ? 'Top: N/A (0)'
            : "Top: ${flightText(rows.first['base'])} (${flightText(rows.first[key])})",
        ReportDonut(
          size: 218,
          showEmptySlice: true,
          values: {
            for (final row in rows)
              flightText(row['base']): (row[key] as num? ?? 0).toInt(),
          },
        ),
      ),
    );
    return RefreshIndicator(
      onRefresh: load,
      child: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          TextField(
            controller: searchController,
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.search),
              hintText: 'Search Report details',
              border: const OutlineInputBorder(),
              suffixIcon: searchController.text.isEmpty
                  ? null
                  : IconButton(
                      tooltip: 'Clear search',
                      icon: const Icon(Icons.cancel),
                      onPressed: () {
                        searchController.clear();
                        searchTimer?.cancel();
                        setState(() {
                          searchDraft = '';
                          search = '';
                        });
                      },
                    ),
            ),
            onChanged: (value) {
              searchDraft = value;
              searchTimer?.cancel();
              setState(() {});
              if (value.trim().isEmpty) {
                setState(() => search = '');
              } else {
                searchTimer = Timer(const Duration(milliseconds: 225), () {
                  if (mounted) setState(() => search = searchDraft);
                });
              }
            },
          ),
          const SizedBox(height: 8),
          if (!searching) ...[
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _Kpi(
                  'Completed Tasks',
                  completed,
                  onTap: () => setState(() {
                    taskKpi = 'completed';
                    activeKpi = 'completed';
                  }),
                ),
                _Kpi(
                  'Due Soon (next 3 days)',
                  dueSoon,
                  color: const Color(0xffd46b08),
                  onTap: () => setState(() {
                    taskKpi = 'dueSoon';
                    activeKpi = 'dueSoon';
                  }),
                ),
                _Kpi(
                  'Overdue Tasks',
                  overdue,
                  color: const Color(0xffcf1322),
                  onTap: () => setState(() {
                    taskKpi = 'overdue';
                    activeKpi = 'overdue';
                  }),
                ),
                const _Kpi('Module Reports', 9),
              ],
            ),
            baseChart(
              'Base Damage Distribution',
              'damagedCount',
              damage,
              'baseDamage',
            ),
            baseChart(
              'Base Repaired Distribution',
              'repairedCount',
              repairs,
              'baseRepair',
            ),
          ],
          if (canExportModule(
            flightText(widget.session.user?['jobTitle']),
            'reports',
          ))
            _ReportPanel(
              'Export Reports',
              'Select a file type and export',
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'FILE TYPE',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.black54,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  DropdownButtonFormField<String>(
                    initialValue: fileType,
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                    ),
                    items: const ['PDF', 'Excel']
                        .map(
                          (type) =>
                              DropdownMenuItem(value: type, child: Text(type)),
                        )
                        .toList(),
                    onChanged: exporting
                        ? null
                        : (value) => setState(() => fileType = value ?? 'PDF'),
                  ),
                  const SizedBox(height: 6),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: exporting
                          ? null
                          : () =>
                                fileType == 'PDF' ? exportPdf() : exportExcel(),
                      icon: Icon(
                        fileType == 'PDF'
                            ? Icons.picture_as_pdf
                            : Icons.table_view,
                      ),
                      label: Text(exporting ? 'Exporting...' : 'Export'),
                    ),
                  ),
                ],
              ),
            ),
          if (!searching) ...[
            _ReportPanel(
              'Insight Drilldown',
              activeKpi == 'baseDamage'
                  ? 'Base vs. Damage Reports'
                  : activeKpi == 'baseRepair'
                  ? 'Base vs. Repaired Aircraft'
                  : 'Task records for the selected operational KPI',
              activeKpi.startsWith('base')
                  ? Column(
                      children: [
                        for (final row
                            in activeKpi == 'baseDamage' ? damage : repairs)
                          ListTile(
                            title: Text(flightText(row['base'])),
                            trailing: Text(
                              flightText(
                                row[activeKpi == 'baseDamage'
                                    ? 'damagedCount'
                                    : 'repairedCount'],
                              ),
                            ),
                          ),
                        if ((activeKpi == 'baseDamage' ? damage : repairs)
                            .isEmpty)
                          const Text('No base records for this view.'),
                      ],
                    )
                  : Row(
                      children: [
                        for (final pair in const [
                          ('completed', 'Completed'),
                          ('dueSoon', 'Due Soon'),
                          ('overdue', 'Overdue'),
                        ])
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: TextButton(
                                onPressed: () => setState(() {
                                  taskKpi = pair.$1;
                                  activeKpi = pair.$1;
                                }),
                                style: TextButton.styleFrom(
                                  backgroundColor: taskKpi == pair.$1
                                      ? const Color(0xff26866f)
                                      : const Color(0xfff1f3f2),
                                  foregroundColor: taskKpi == pair.$1
                                      ? Colors.white
                                      : Colors.black54,
                                ),
                                child: Text(
                                  '${pair.$2} (${(pair.$1 == 'completed'
                                              ? completed
                                              : pair.$1 == 'dueSoon'
                                              ? dueSoon
                                              : overdue)
                                          .toString()})',
                                  style: const TextStyle(fontSize: 9),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
            ),
            if (!activeKpi.startsWith('base')) ...[
              if (loading) const _ReportsLoading(),
              if (!loading && drilldown.isEmpty)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(20),
                    child: Text('No task records for this view.'),
                  ),
                ),
              for (final task in drilldown.take(12))
                _ReportPanel(
                  flightText(reportFirstValue([task['aircraft']], 'N/A')),
                  flightText(
                    reportFirstValue([
                      task['title'],
                      flightMap(task['summary'])['category'],
                    ], 'Untitled task'),
                  ),
                  Wrap(
                    spacing: 12,
                    runSpacing: 8,
                    children: [
                      detail(
                        'Mechanic',
                        flightText(
                          reportFirstValue([
                            task['assignedToName'],
                            task['assignedMechanic'],
                          ], 'Unassigned'),
                        ),
                      ),
                      detail('Type', flightText(task['maintenanceType'])),
                      detail(
                        'Due Date',
                        reportDate(
                          reportFirstValue([
                            task['dueDate'],
                            task['endDateTime'],
                          ]),
                        ),
                      ),
                      detail(
                        'Priority',
                        flightText(
                          reportFirstValue([task['priority']], 'Normal'),
                        ),
                      ),
                    ],
                  ),
                  right: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 9,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(999),
                      color:
                          (taskKpi == 'overdue'
                                  ? const Color(0xffcf1322)
                                  : const Color(0xff26866f))
                              .withValues(alpha: .09),
                    ),
                    child: Text(
                      flightText(task['status'] ?? 'Pending'),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: taskKpi == 'overdue'
                            ? const Color(0xffcf1322)
                            : const Color(0xff26866f),
                      ),
                    ),
                  ),
                ),
            ],
          ],
          const SizedBox(height: 8),
          Text(
            searching ? 'Search Results' : 'Module Reports',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          Text(
            searching
                ? 'Showing matched report modules first, then related modules.'
                : 'Mobile charts aligned with web analytics',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          if (loading && searching) const _ReportsLoading(),
          if (!loading && searching && ranked.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(20),
                child: Text('No matching report modules found.'),
              ),
            ),
          if (topMatch != null) ...[
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Text(
                'Top Match: ${topMatch.title}',
                style: const TextStyle(
                  color: Color(0xff26866f),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            topMatch.builder(),
          ],
          for (final group in grouped.entries) ...[
            if (searching)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Text(
                  '${group.key} Reports',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            for (final card in group.value) card.builder(),
          ],
        ],
      ),
    );
  }
}

class _ReportsLoading extends StatelessWidget {
  const _ReportsLoading();
  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.symmetric(vertical: 20),
    child: Center(
      child: Column(
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 8),
          Text('Loading reports...', style: TextStyle(fontSize: 12)),
        ],
      ),
    ),
  );
}

class _Kpi extends StatelessWidget {
  const _Kpi(
    this.label,
    this.value, {
    this.onTap,
    this.color = const Color(0xff26866f),
  });
  final String label;
  final int value;
  final VoidCallback? onTap;
  final Color color;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: (MediaQuery.sizeOf(context).width - 40) * .48,
    child: Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xffe4e4e4)),
      ),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 11, color: Color(0xff5c5c5c)),
              ),
              Text(
                '$value',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class ReportArea extends StatelessWidget {
  const ReportArea(
    this.points, {
    super.key,
    required this.color,
    required this.legend,
  });
  final List<MapEntry<String, int>> points;
  final Color color;
  final String legend;
  @override
  Widget build(BuildContext context) {
    if (points.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(
          child: Text('No chart data', style: TextStyle(fontSize: 12)),
        ),
      );
    }
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = math.max(
          320.0,
          math.max(constraints.maxWidth, points.length * 110.0 + 128),
        );
        return Column(
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: SizedBox(
                width: width,
                height: 230,
                child: CustomPaint(
                  painter: _ReportAreaPainter(
                    points.map((point) => point.value).toList(),
                    color,
                  ),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 182, 18, 0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        for (final point in points)
                          SizedBox(
                            width: 85,
                            child: Text(
                              point.key,
                              textAlign: TextAlign.center,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 10),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 5),
                Text(
                  legend,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
        );
      },
    );
  }
}

class _ReportAreaPainter extends CustomPainter {
  const _ReportAreaPainter(this.values, this.color);
  final List<int> values;
  final Color color;
  @override
  void paint(Canvas canvas, Size size) {
    final plot = Rect.fromLTWH(35, 12, size.width - 55, 155);
    final maximum = math.max(1, values.fold<int>(0, math.max));
    for (var index = 0; index <= 4; index++) {
      final y = plot.bottom - index * plot.height / 4;
      canvas.drawLine(
        Offset(plot.left, y),
        Offset(plot.right, y),
        Paint()
          ..color = const Color(0xfff0f0f0)
          ..strokeWidth = 1,
      );
      final label = TextPainter(
        text: TextSpan(
          text: (maximum * index / 4).round().toString(),
          style: const TextStyle(fontSize: 9, color: Color(0xff5c5c5c)),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      label.paint(
        canvas,
        Offset(plot.left - label.width - 5, y - label.height / 2),
      );
    }
    Offset point(int index) => Offset(
      plot.left +
          (values.length == 1
              ? plot.width / 2
              : index * plot.width / (values.length - 1)),
      plot.bottom - values[index] / maximum * plot.height,
    );
    final path = Path()..moveTo(point(0).dx, point(0).dy);
    for (var index = 1; index < values.length; index++) {
      final previous = point(index - 1);
      final current = point(index);
      final midpoint = (previous.dx + current.dx) / 2;
      path.cubicTo(
        midpoint,
        previous.dy,
        midpoint,
        current.dy,
        current.dx,
        current.dy,
      );
    }
    final fill = Path.from(path)
      ..lineTo(point(values.length - 1).dx, plot.bottom)
      ..lineTo(point(0).dx, plot.bottom)
      ..close();
    canvas.drawPath(fill, Paint()..color = color.withValues(alpha: .12));
    canvas.drawPath(
      path,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5,
    );
    for (var index = 0; index < values.length; index++) {
      canvas.drawCircle(point(index), 4, Paint()..color = Colors.white);
      canvas.drawCircle(point(index), 3, Paint()..color = color);
    }
  }

  @override
  bool shouldRepaint(covariant _ReportAreaPainter oldDelegate) =>
      !identical(values, oldDelegate.values) || color != oldDelegate.color;
}

class ReportDonut extends StatelessWidget {
  const ReportDonut({
    super.key,
    required this.values,
    this.size = 196,
    this.emptyText = 'No data available',
    this.colors,
    this.showEmptySlice = false,
    this.fitToWidth = false,
  });
  final Map<String, int> values;
  final double size;
  final String emptyText;
  final List<Color>? colors;
  final bool showEmptySlice;
  final bool fitToWidth;
  static const palette = <Color>[
    Color(0xff26866f),
    Color(0xff1890ff),
    Color(0xfffaad14),
    Color(0xfff5222d),
    Color(0xff722ed1),
    Color(0xff13c2c2),
    Color(0xffeb2f96),
    Color(0xff52c41a),
  ];
  @override
  Widget build(BuildContext context) {
    final positive = values.entries.where((entry) => entry.value > 0).toList();
    final entries = positive.isEmpty && showEmptySlice
        ? [const MapEntry('No data', 1)]
        : positive;
    final effectiveColors = positive.isEmpty && showEmptySlice
        ? const <Color>[Color(0xffd9d9d9)]
        : (colors ?? palette);
    final total = entries.fold<int>(0, (sum, entry) => sum + entry.value);
    if (total == 0) {
      return Padding(
        padding: const EdgeInsets.all(20),
        child: Center(
          child: Text(emptyText, style: const TextStyle(fontSize: 12)),
        ),
      );
    }
    return LayoutBuilder(
      builder: (context, constraints) {
        final viewport = math
            .min(math.max(MediaQuery.sizeOf(context).width - 68, 260), 560)
            .toDouble();
        final width = fitToWidth
            ? math.max(260.0, viewport)
            : math.max(
                320.0,
                math.max(
                  viewport,
                  math.max(
                    size + 76,
                    math.min(
                      620.0,
                      math.max(size + 76, entries.length * 132.0),
                    ),
                  ),
                ),
              );
        return SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: SizedBox(
            width: width,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Column(
                children: [
                  SizedBox(
                    width: size,
                    height: size,
                    child: CustomPaint(
                      size: Size(size, size),
                      painter: _DonutPainter(
                        entries.map((entry) => entry.value).toList(),
                        effectiveColors,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  for (var index = 0; index < entries.length; index++)
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        vertical: 4,
                        horizontal: 8,
                      ),
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xfff7faf9),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                color:
                                    effectiveColors[index %
                                        effectiveColors.length],
                                borderRadius: BorderRadius.circular(3),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '${entries[index].key}: ${entries[index].value} (${(entries[index].value / total * 100).round()}%)',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _DonutPainter extends CustomPainter {
  const _DonutPainter(this.values, this.colors);
  final List<int> values;
  final List<Color> colors;
  @override
  void paint(Canvas canvas, Size size) {
    final total = values.fold<int>(0, (sum, value) => sum + value);
    if (total == 0) return;
    final radius = math.min(size.width, size.height) / 2 - 12;
    final rect = Rect.fromCircle(
      center: size.center(Offset.zero),
      radius: radius,
    );
    var start = -math.pi / 2;
    for (var index = 0; index < values.length; index++) {
      final sweep = values[index] / total * math.pi * 2;
      canvas.drawArc(
        rect,
        start,
        sweep,
        true,
        Paint()
          ..style = PaintingStyle.fill
          ..color = colors[index % colors.length],
      );
      start += sweep;
    }
  }

  @override
  bool shouldRepaint(covariant _DonutPainter oldDelegate) =>
      !identical(values, oldDelegate.values) ||
      !identical(colors, oldDelegate.colors);
}
