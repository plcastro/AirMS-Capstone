import 'package:flutter/services.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

Future<void> shareAirmsPdf({required String title, required String fileName,
    required List<String> columns, required List<List<String>> rows,
    String? subtitle, List<List<String>>? summaryRows,
    List<List<String>>? distributionRows, bool portrait = false,
    String? executedBy}) async {
  final document = pw.Document();
  final headerStyle = pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.white, fontSize: 9);
  final cellStyle = const pw.TextStyle(fontSize: 8);
  List<pw.Widget> section(String name, List<String> headers, List<List<String>> values) => [
      pw.Text(name, style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold,
        color: PdfColors.green800)), pw.SizedBox(height: 6),
      pw.Table(border: pw.TableBorder.all(color: PdfColors.grey300, width: .5), children: [
        pw.TableRow(decoration: const pw.BoxDecoration(color: PdfColors.green800), children: [
          for (final header in headers) pw.Padding(padding: const pw.EdgeInsets.all(5),
            child: pw.Text(header, style: headerStyle)),
        ]),
        for (final row in values) pw.TableRow(children: [
          for (var index = 0; index < headers.length; index++) pw.Padding(
            padding: const pw.EdgeInsets.all(5),
            child: pw.Text(index < row.length ? row[index] : '', style: cellStyle)),
        ]),
      ]), pw.SizedBox(height: 14),
    ];
  document.addPage(pw.MultiPage(pageFormat: portrait ? PdfPageFormat.a4 : PdfPageFormat.a4.landscape,
    margin: const pw.EdgeInsets.all(28),
    header: (_) => pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceBetween, children: [
      pw.Text('AirMS', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.green800)),
      pw.Text(DateTime.now().toLocal().toIso8601String().split('T').first),
    ]),
    footer: (context) => pw.Align(alignment: pw.Alignment.centerRight,
      child: pw.Text('Page ${context.pageNumber} of ${context.pagesCount}', style: const pw.TextStyle(fontSize: 8))),
    build: (_) => [
      pw.SizedBox(height: 12),
      pw.Text(title, style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold)),
      if (subtitle != null) pw.Text(subtitle, style: const pw.TextStyle(fontSize: 10)),
      if (executedBy != null) pw.Text('Executed By: $executedBy', style: const pw.TextStyle(fontSize: 10)),
      pw.SizedBox(height: 16),
      if (summaryRows != null) ...section('Summary', const ['Metric', 'Value'], summaryRows),
      if (distributionRows != null) ...section('Status Distribution', const ['Status', 'Count'], distributionRows),
      ...section(summaryRows == null ? title : 'Requisitions', columns, rows),
    ]));
  await Printing.sharePdf(bytes: await document.save(), filename: fileName);
}

Future<void> shareAirmsAnalyticsPdf({required String title, required String fileName,
    required List<Map<String, dynamic>> sections, required String executedBy,
    required List<Map<String, String>> summaryCards,
    required List<Map<String, dynamic>> barCharts}) async {
  final document = pw.Document();
  pw.ImageProvider? logo;
  try {
    logo = pw.MemoryImage((await rootBundle.load('assets/ngcp-logo.png')).buffer.asUint8List());
  } catch (_) {}
  final widgets = <pw.Widget>[
    pw.Row(children: [
      if (logo != null) pw.Image(logo, width: 78, height: 55, fit: pw.BoxFit.contain),
      pw.SizedBox(width: 14),
      pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
        pw.Text(title, style: pw.TextStyle(fontSize: 20, color: PdfColors.green800,
          fontWeight: pw.FontWeight.bold)),
        pw.Text('Generated: ${DateTime.now().toLocal().toIso8601String().replaceFirst('T', ' ').split('.').first}',
          style: const pw.TextStyle(fontSize: 9)),
        pw.Text('Executed By: $executedBy', style: const pw.TextStyle(fontSize: 9)),
      ]),
    ]),
    pw.SizedBox(height: 14),
    pw.Text('KPI Summary', style: pw.TextStyle(fontSize: 15, fontWeight: pw.FontWeight.bold,
      color: PdfColors.green800)),
    pw.Wrap(spacing: 8, runSpacing: 8, children: [
      for (final card in summaryCards) pw.Container(width: 154, padding: const pw.EdgeInsets.all(8),
        decoration: pw.BoxDecoration(border: pw.Border.all(color: PdfColors.grey300)),
        child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
          pw.Text(card['label'] ?? '', style: const pw.TextStyle(fontSize: 9)),
          pw.SizedBox(height: 5),
          pw.Text(card['value'] ?? '', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
        ])),
    ]),
    pw.SizedBox(height: 14),
    pw.Text('Charts', style: pw.TextStyle(fontSize: 15, fontWeight: pw.FontWeight.bold,
      color: PdfColors.green800)),
  ];
  for (final chart in barCharts) {
    final rows = (chart['rows'] as List? ?? []).whereType<Map>().take(8).toList();
    final maxValue = rows.map((row) => num.tryParse('${row['value'] ?? 0}') ?? 0)
        .fold<num>(1, (a, b) => a > b ? a : b);
    widgets.add(pw.Text('${chart['title'] ?? ''}',
      style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold)));
    for (final row in rows) {
      final value = num.tryParse('${row['value'] ?? 0}') ?? 0;
      widgets.add(pw.Padding(padding: const pw.EdgeInsets.symmetric(vertical: 2), child: pw.Row(children: [
        pw.SizedBox(width: 130, child: pw.Text('${row['label'] ?? ''}', style: const pw.TextStyle(fontSize: 8))),
        pw.Expanded(child: pw.LinearProgressIndicator(value: (value / maxValue).clamp(0, 1).toDouble(),
          valueColor: PdfColors.green700, backgroundColor: PdfColors.grey200)),
        pw.SizedBox(width: 32, child: pw.Text('$value', textAlign: pw.TextAlign.right,
          style: const pw.TextStyle(fontSize: 8))),
      ])));
    }
    widgets.add(pw.SizedBox(height: 8));
  }
  for (final section in sections) {
    final columns = (section['columns'] as List? ?? []).map((value) => '$value').toList();
    final rows = (section['rows'] as List? ?? []).map((value) => value is List
      ? value.map((cell) => '${cell ?? ''}').toList() : <String>['$value']).toList();
    if (columns.isEmpty) continue;
    widgets.add(pw.SizedBox(height: 8));
    widgets.add(pw.Text('${section['title'] ?? 'Report'}', style: pw.TextStyle(
      fontSize: 14, color: PdfColors.green800, fontWeight: pw.FontWeight.bold)));
    widgets.add(pw.SizedBox(height: 5));
    widgets.add(pw.Table(border: pw.TableBorder.all(color: PdfColors.grey300, width: .5),
      children: [
        pw.TableRow(decoration: const pw.BoxDecoration(color: PdfColors.green800), children: [
          for (final column in columns) pw.Padding(padding: const pw.EdgeInsets.all(5),
            child: pw.Text(column, style: pw.TextStyle(fontSize: 8,
              color: PdfColors.white, fontWeight: pw.FontWeight.bold))),
        ]),
        for (final row in rows) pw.TableRow(children: [
          for (var i = 0; i < columns.length; i++) pw.Padding(padding: const pw.EdgeInsets.all(5),
            child: pw.Text(i < row.length ? row[i] : '', style: const pw.TextStyle(fontSize: 8))),
        ]),
      ]));
  }
  document.addPage(pw.MultiPage(pageFormat: PdfPageFormat.a4,
    margin: const pw.EdgeInsets.all(28),
    footer: (context) => pw.Align(alignment: pw.Alignment.centerRight,
      child: pw.Text('Page ${context.pageNumber} of ${context.pagesCount}',
        style: const pw.TextStyle(fontSize: 8))),
    build: (_) => widgets));
  await Printing.sharePdf(bytes: await document.save(), filename: fileName);
}
