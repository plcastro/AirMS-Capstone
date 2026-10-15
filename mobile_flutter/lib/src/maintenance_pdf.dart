import 'package:flutter/services.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

String _value(dynamic value) => value == null ? '' : '$value';

String _first(Map record, List<String> keys) {
  for (final key in keys) {
    final value = _value(record[key]).trim();
    if (value.isNotEmpty) return value;
  }
  return '';
}

Future<Uint8List> buildMaintenancePdf(Map<String, dynamic> log,
    {Map<String, dynamic>? aircraftData}) async {
  final aircraft = aircraftData ?? const <String, dynamic>{};
  final reference = aircraft['referenceData'] is Map
      ? Map<String, dynamic>.from(aircraft['referenceData'] as Map)
      : <String, dynamic>{};
  final rawDetails = log['workDetails'] as List? ?? const [];
  final work = rawDetails.map((item) => item is Map ? _value(item['description']) : _value(item))
      .where((item) => item.trim().isNotEmpty).toList();
  if (work.isEmpty) {
    for (final item in [log['correctiveActionDone'], log['defects']]) {
      final value = item is Map ? _value(item['description']) : _value(item);
      if (value.trim().isNotEmpty) work.add(value);
    }
  }
  if (work.isEmpty) work.add('');
  final serial = _first(aircraft, ['serialNumber']).isNotEmpty
      ? _first(aircraft, ['serialNumber'])
      : _first(log, ['sn']).isNotEmpty
          ? _first(log, ['sn'])
          : _first(log, ['aircraft']).replaceAll(RegExp(r'[^0-9]'), '');
  final dateRaw = _first(log, ['dateDefectRectified', 'dateRectified', 'completedAt', 'updatedAt', 'createdAt']);
  final parsedDate = DateTime.tryParse(dateRaw);
  final date = parsedDate == null ? dateRaw : '${parsedDate.month}/${parsedDate.day}/${parsedDate.year}';
  pw.ImageProvider? logo;
  try {
    logo = pw.MemoryImage((await rootBundle.load('assets/ngcp-logo.png')).buffer.asUint8List());
  } catch (_) { /* Preserve the certificate when the asset is unavailable. */ }

  final document = pw.Document();
  final border = pw.Border.all(color: PdfColors.black, width: 0.7);
  pw.Widget meta(String label, String value) => pw.Container(
    height: 17, decoration: pw.BoxDecoration(border: border),
    child: pw.Row(children: [
      pw.Container(width: 63, padding: const pw.EdgeInsets.symmetric(horizontal: 2),
        decoration: const pw.BoxDecoration(border: pw.Border(right: pw.BorderSide(width: 0.7))),
        child: pw.Text(label, style: pw.TextStyle(fontSize: 7, fontWeight: pw.FontWeight.bold))),
      pw.Expanded(child: pw.Padding(padding: const pw.EdgeInsets.symmetric(horizontal: 3),
        child: pw.Text(value, style: const pw.TextStyle(fontSize: 7)))),
    ]));
  document.addPage(pw.MultiPage(pageFormat: PdfPageFormat.a4,
    margin: const pw.EdgeInsets.all(26),
    build: (_) => [
      pw.Container(height: 15, decoration: pw.BoxDecoration(border: border)),
      pw.Row(children: [
        pw.Expanded(child: pw.Column(children: [
          meta('ACFT TYPE:', _first(aircraft, ['aircraftType']).isNotEmpty
              ? _first(aircraft, ['aircraftType']) : _first(log, ['aircraftType']).isNotEmpty
                  ? _first(log, ['aircraftType']) : 'AS350 B3'),
          meta('ACFT REG:', _first(log, ['aircraft'])),
          meta('ACFT S/N:', serial),
          meta('W.O. #:', _first(log, ['sourceTaskId', 'id', '_id'])),
        ])),
        pw.Container(width: 195, height: 68, decoration: pw.BoxDecoration(border: border),
          alignment: pw.Alignment.center, child: logo == null
              ? pw.Text('NGCP', style: pw.TextStyle(fontSize: 26, fontWeight: pw.FontWeight.bold))
              : pw.Image(logo, width: 145, height: 53, fit: pw.BoxFit.contain)),
        pw.Expanded(child: pw.Column(children: [
          meta('AIRCRAFT TT:', _first(reference, ['acftTT']).isNotEmpty
              ? _first(reference, ['acftTT']) : _first(log, ['aircraftTT', 'acftTT'])),
          meta('LANDING CYC:', _first(reference, ['landings']).isNotEmpty
              ? _first(reference, ['landings']) : _first(log, ['landingCycles', 'landings'])),
          meta('ENGINE: TT:', _first(reference, ['engTT', 'acftTT']).isNotEmpty
              ? _first(reference, ['engTT', 'acftTT']) : _first(log, ['engineTT', 'engTT'])),
          meta('ENGINE CYC:', _first(reference, ['n2Cycles']).isNotEmpty
              ? 'N2: ${_first(reference, ['n2Cycles'])}' : _first(log, ['engineCycles', 'n2Cycles'])),
        ])),
      ]),
      pw.Container(width: double.infinity, padding: const pw.EdgeInsets.all(7),
        decoration: pw.BoxDecoration(border: border), alignment: pw.Alignment.center,
        child: pw.Text('WORK DONE REPORT /\nCERTIFICATE OF RETURN TO SERVICE',
          textAlign: pw.TextAlign.center,
          style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold))),
      pw.Container(width: double.infinity, padding: const pw.EdgeInsets.all(4),
        decoration: pw.BoxDecoration(border: border),
        child: pw.Text('DESCRIPTION OF WORK:', style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold))),
      pw.Table(border: pw.TableBorder.all(width: .7), columnWidths: const {0: pw.FixedColumnWidth(38)},
        children: [for (var i = 0; i < work.length; i++) pw.TableRow(children: [
          pw.Padding(padding: const pw.EdgeInsets.all(5), child: pw.Text('${i + 1}', textAlign: pw.TextAlign.center)),
          pw.Padding(padding: const pw.EdgeInsets.all(5), child: pw.Text(work[i], style: const pw.TextStyle(fontSize: 9))),
        ])]),
      pw.Container(width: double.infinity, padding: const pw.EdgeInsets.all(10),
        decoration: pw.BoxDecoration(border: border), child: pw.Column(children: [
          pw.Text('I hereby certify that unless otherwise specified, the work has been carried out in accordance with the current rules of CAAP and in respect to that work the aircraft or aircraft component is considered fit for return to service',
            style: const pw.TextStyle(fontSize: 9)),
          pw.SizedBox(height: 8),
          pw.Text('Date: $date', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 18),
          pw.Row(children: [
            pw.Expanded(child: pw.Column(children: [
              pw.Text('Mechanic in-charge: ${_first(log, ['mechanicInCharge', 'reportedBy'])}'),
              pw.SizedBox(height: 12), pw.Text('${_first(log, ['mechanicLicenseNo', 'licenseNo'])} - AMT'),
            ])),
            pw.Expanded(child: pw.Column(children: [
              pw.Text('Inspector: ${_first(log, ['inspector', 'approvedBy'])}'),
              pw.SizedBox(height: 12), pw.Text('${_first(log, ['inspectorLicenseNo'])} - AMT'),
            ])),
          ]),
        ])),
    ]));
  return document.save();
}

