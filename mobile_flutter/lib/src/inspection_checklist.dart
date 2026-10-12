import 'dart:convert';
import 'package:flutter/services.dart';

Future<List<Map<String, dynamic>>> loadInspectionChecklist(String kind, String aircraftType) async {
  final b412 = aircraftType.toUpperCase().contains('412');
  final path = b412 ? 'assets/b412${kind == 'pre' ? 'Pre' : 'Post'}InspectionChecklist.json'
    : 'assets/as350InspectionChecklist.json';
  final data = jsonDecode(await rootBundle.loadString(path)) as Map<String, dynamic>;
  if (b412) {
    return [for (final section in data['sections'] as List)
      for (final row in (section as Map)['items'] as List)
        {...Map<String, dynamic>.from(row as Map), '_section': '${section['title'] ?? ''}'}];
  }
  return [for (final row in data[kind] as List)
    {...Map<String, dynamic>.from(row as Map), '_section': _as350Section('${row['key'] ?? ''}')}];
}

String _as350Section(String key) {
  final prefix = key.split('_').first
    .replaceAllMapped(RegExp(r'([a-z])([A-Z])'), (match) => '${match[1]} ${match[2]}')
    .replaceAllMapped(RegExp(r'([A-Za-z])(\d)'), (match) => '${match[1]} ${match[2]}');
  return prefix.isEmpty ? 'Checklist' : '${prefix[0].toUpperCase()}${prefix.substring(1)}';
}
