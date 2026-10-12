import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

String _value(dynamic item) => item == null ? '' : '$item';
Map _map(dynamic item) => item is Map ? item : {};
List<Map> _rows(dynamic item) => (item is List ? item : <dynamic>[]).whereType<Map>().toList();
String _oil(Map row, String section, String field, String legacy) =>
  _value(_map(row[section])[field] ?? row[legacy]);
String _station(Map leg) {
  final stations = _rows(leg['stations']);
  if (stations.isNotEmpty) return stations.map((row) => '${_value(row['from'])} - ${_value(row['to'])}').join(', ');
  return '${_value(leg['from'])} - ${_value(leg['to'])}';
}

pw.Widget _table(String title, List<String> columns, List<List<String>> rows) {
  const cell = pw.TextStyle(fontSize: 7);
  final heading = pw.TextStyle(fontSize: 7, fontWeight: pw.FontWeight.bold, color: PdfColors.white);
  return pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
    pw.SizedBox(height: 8),
    pw.Text(title, style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
    pw.SizedBox(height: 3),
    pw.Table(border: pw.TableBorder.all(color: PdfColors.grey500, width: .35), children: [
      pw.TableRow(decoration: const pw.BoxDecoration(color: PdfColors.green800), children: [
        for (final column in columns) pw.Padding(padding: const pw.EdgeInsets.all(3), child: pw.Text(column, style: heading)),
      ]),
      for (final row in rows) pw.TableRow(children: [
        for (var index = 0; index < columns.length; index++) pw.Padding(padding: const pw.EdgeInsets.all(3),
          child: pw.Text(index < row.length ? row[index] : '', style: cell)),
      ]),
    ]),
  ]);
}

pw.Widget _signature(String label, dynamic value) {
  final signature = _value(value);
  if (!signature.startsWith('data:image/')) return pw.Text('$label: ${signature.isEmpty ? '-' : signature}', style: const pw.TextStyle(fontSize: 8));
  try {
    final bytes = base64Decode(signature.split(',').last);
    return pw.Row(children: [pw.Text('$label: ', style: const pw.TextStyle(fontSize: 8)),
      pw.Image(pw.MemoryImage(bytes), width: 110, height: 35)]);
  } catch (_) { return pw.Text('$label: signature on file', style: const pw.TextStyle(fontSize: 8)); }
}

Future<Uint8List> buildFlightLogTemplatePdf(Map<String, dynamic> log, Map<String, dynamic> workspace) async {
  final b412 = _value(log['aircraftType']).toUpperCase().contains('412');
  final document = pw.Document();
  final logo = pw.MemoryImage((await rootBundle.load('assets/ngcp-logo.png')).buffer.asUint8List());
  final legs = _rows(log['legs']);
  final component = _map(log['componentData']);
  final b412Data = _map(log['b412Data']);
  final b412Component = _map(b412Data['componentData']);
  final fuelRows = b412 && _rows(b412Data['fuelServicing']).isNotEmpty
    ? _rows(b412Data['fuelServicing']) : _rows(log['fuelServicing']);
  final oilRows = b412 && _rows(b412Data['oilServicing']).isNotEmpty
    ? _rows(b412Data['oilServicing']) : _rows(log['oilServicing']);
  final sections = <pw.Widget>[
    pw.Row(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
      pw.Image(logo, width: 100, height: 42), pw.SizedBox(width: 16),
      pw.Expanded(child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
        pw.Text(b412 ? 'AIRCRAFT FLIGHT LOG - TWIN ENGINE' : 'AIRCRAFT FLIGHT LOG - RW - SINGLE ENGINE',
          style: pw.TextStyle(fontSize: 15, fontWeight: pw.FontWeight.bold, color: PdfColors.green800)),
        pw.Text('Aircraft type: ${_value(log['aircraftType'])}    RP-C: ${_value(log['rpc'])}    Control: ${_value(log['controlNo'])}',
          style: const pw.TextStyle(fontSize: 8)),
        pw.Text('Date: ${_value(log['date'])}    Purpose: ${_value(log['flightPurpose'])}', style: const pw.TextStyle(fontSize: 8)),
      ])),
    ]),
    _table('FLIGHT LEGS', const ['Leg', 'Stations', 'Block On', 'Block Off', 'Flight On', 'Flight Off', 'Block Total', 'Flight Total'], [
      for (var index = 0; index < legs.length; index++) [
        '${index + 1}', _station(legs[index]), _value(legs[index]['blockTimeOn']), _value(legs[index]['blockTimeOff']),
        _value(legs[index]['flightTimeOn']), _value(legs[index]['flightTimeOff']),
        _value(legs[index]['totalBlockTime'] ?? legs[index]['totalTimeOn']),
        _value(legs[index]['totalFlightTime'] ?? legs[index]['totalTimeOff']),
      ],
    ]),
    _table('PASSENGERS', const ['Leg', 'Date', 'Passengers'], [
      for (var index = 0; index < legs.length; index++)
        ['${index + 1}', _value(legs[index]['date'] ?? log['date']), _value(legs[index]['passengers'])],
    ]),
  ];
  if (b412) {
    sections.add(_table('BELL 412 PASSENGER MANIFEST', const ['Row', 'Leg 1', 'Leg 2', 'Leg 3', 'Leg 4', 'Leg 5', 'Leg 6'], [
      for (var index = 0; index < _rows(b412Data['passengerRows']).length; index++) [
        '${index + 1}',
        for (var leg = 0; leg < 6; leg++)
          leg < (_rows(b412Data['passengerRows'])[index]['legs'] as List? ?? []).length
            ? _value((_rows(b412Data['passengerRows'])[index]['legs'] as List)[leg]) : '',
      ],
    ]));
  }
  final as350Fields = const ['airframe', 'gearBoxMain', 'gearBoxTail', 'rotorMain', 'rotorTail',
    'engine', 'cycleN1', 'cycleN2', 'usage', 'landingCycle'];
  final b412Fields = const ['airframe', 'mrGearbox', 'tr90Gearbox', 'tr42Gearbox',
    'engine1', 'engine2', 'landingCycle'];
  final fields = b412 ? b412Fields : as350Fields;
  final componentRows = <List<String>>[];
  for (final (label, key) in [('Brought forward', 'broughtForwardData'), ('This flight', 'thisFlightData'), ('To date', 'toDateData')]) {
    final data = _map(b412 ? (b412Component[key] ?? component[key] ?? log[key]) : (component[key] ?? log[key]));
    componentRows.add([label, for (final field in fields) _value(data[field] is Map ? _map(data[field])['tsn'] : data[field])]);
  }
  sections.add(_table(b412 ? 'COMPONENT TIMES - TWIN ENGINE' : 'COMPONENT TIMES - SINGLE ENGINE',
    ['Period', ...fields], componentRows));
  if (b412) {
    sections.add(_table('ENGINE AND GEARBOX DETAIL', const ['Period', 'Engine 1 TSN', 'Engine 1 TSO', 'Engine 1 cycle',
      'Engine 2 TSN', 'Engine 2 TSO', 'Engine 2 cycle', 'Sling', 'Others'], [
      for (final (label, key) in [('Brought forward', 'broughtForwardData'), ('This flight', 'thisFlightData'), ('To date', 'toDateData')])
        (() {
          final source = _map(b412Component[key] ?? component[key] ?? log[key]);
          final first = _map(source['engine1']), second = _map(source['engine2']);
          return [label, _value(first['tsn']), _value(first['tso']), _value(first['cycle']),
            _value(second['tsn']), _value(second['tso']), _value(second['cycle']),
            _value(source['sling']), _value(source['others'])];
        })(),
    ]));
    sections.add(_table('BELL 412 INSPECTION LIMITS', const ['Airframe next due at', 'Engine next due at'], [[
      _value(b412Component['airframeNextInspectionDueAt']),
      _value(b412Component['engineNextInspectionDueAt']),
    ]]));
  }
  sections.add(_table('FUEL SERVICING', b412
    ? const ['Leg', 'Cont. Check', 'Main Rem/G', 'Main Add', 'Main Total', 'Supply Sys 1', 'Supply Sys 2', 'Remarks', 'Refueller']
    : const ['Leg', 'Date', 'Cont. Check', 'Main Rem/G', 'Main Add', 'Main Total', 'Source', 'Refueller'], [
    for (var index = 0; index < fuelRows.length; index++)
      (() { final fuel = fuelRows[index]; return b412 ? [
        '${index + 1}', _value(fuel['contCheck']),
        _value(fuel['mainTankRemaining'] ?? fuel['mainRemG']),
        _value(fuel['mainTankAdded'] ?? fuel['mainAdd']),
        _value(fuel['mainTankTotal'] ?? fuel['mainTotal']),
        _value(fuel['supplySystem1'] ?? fuel['sys1']), _value(fuel['supplySystem2'] ?? fuel['sys2']),
        _value(fuel['remarks']), _value(fuel['refuellerName'] ?? fuel['refuelerName']),
      ] : [
        '${index + 1}', _value(fuel['date']), _value(fuel['contCheck']), _value(fuel['mainRemG'] ?? fuel['mainTankRemaining']),
        _value(fuel['mainAdd'] ?? fuel['mainTankAdded']), _value(fuel['mainTotal'] ?? fuel['mainTankTotal']),
        _value(fuel['fuelType'] ?? '${_value(fuel['supplySystem1'])} ${_value(fuel['supplySystem2'])}'.trim()),
        _value(fuel['refuellerName'] ?? fuel['refuelerName']),
      ]; })(),
  ]));
  if (b412) {
    for (final (title, section, legacy) in [
      ('ENGINE NO. 1', 'engine1', 'engine1'), ('ENGINE NO. 2', 'engine2', 'engine2'),
      ('M/R GEARBOX', 'mrGearbox', 'mrGearbox'), ('REDUCTION G/B', 'reductionGearbox', 'reductionGearbox'),
      ('42 T/R GEARBOX', 'tr42Gearbox', 'gearbox42'), ('90 T/R GEARBOX', 'tr90Gearbox', 'gearbox90'),
    ]) {
      sections.add(_table('OIL SERVICING - $title', const ['Row', 'Remaining', 'Added', 'Total'], [
        for (var index = 0; index < oilRows.length; index++) [
          '${index + 1}', _oil(oilRows[index], section, 'remaining', '${legacy}Rem'),
          _oil(oilRows[index], section, 'added', '${legacy}Add'),
          _oil(oilRows[index], section, 'total', '${legacy}Tot'),
        ],
      ]));
    }
  } else {
  sections.add(_table('OIL SERVICING', const ['Leg', 'Date', 'Eng Rem', 'Eng Add', 'Eng Tot', 'M/R Rem', 'M/R Add', 'M/R Tot', 'T/R Rem', 'T/R Add', 'T/R Tot'], [
    for (var index = 0; index < oilRows.length; index++)
      (() { final oil = oilRows[index]; return [
        '${index + 1}', _value(oil['date']), _value(oil['engineRem'] ?? _map(oil['engine1'])['remaining']),
        _value(oil['engineAdd'] ?? _map(oil['engine1'])['added']), _value(oil['engineTot'] ?? _map(oil['engine1'])['total']),
        _value(oil['mrGboxRem'] ?? _map(oil['mrGearbox'])['remaining']),
        _value(oil['mrGboxAdd'] ?? _map(oil['mrGearbox'])['added']),
        _value(oil['mrGboxTot'] ?? _map(oil['mrGearbox'])['total']),
        _value(oil['trGboxRem'] ?? _map(oil['tr42Gearbox'])['remaining']),
        _value(oil['trGboxAdd'] ?? _map(oil['tr42Gearbox'])['added']),
        _value(oil['trGboxTot'] ?? _map(oil['tr42Gearbox'])['total']),
      ]; })(),
  ]));
  }
  for (var index = 0; index < fuelRows.length; index++) {
    sections.add(_signature('Fuel service ${index + 1}', fuelRows[index]['signature']));
  }
  for (var index = 0; index < oilRows.length; index++) {
    sections.add(_signature('Oil service ${index + 1}', oilRows[index]['mechanicSignature'] ?? oilRows[index]['signature']));
  }
  sections.add(_table('MAINTENANCE WORK', const ['Item', 'Type', 'Work done', 'Mechanic', 'Certificate'], [
    for (var index = 0; index < _rows(log['workItems']).length; index++)
      ['${index + 1}', (_rows(log['workItems'])[index]['selectedWorkTypes'] as List? ?? []).join(', '),
        _value(_rows(log['workItems'])[index]['workDone'] ?? _rows(log['workItems'])[index]['description']),
        _value(_rows(log['workItems'])[index]['name']), _value(_rows(log['workItems'])[index]['certificateNumber'])],
  ]));
  for (var index = 0; index < _rows(log['workItems']).length; index++) {
    final row = _rows(log['workItems'])[index];
    sections.add(_signature('Work item ${index + 1} - ${_value(row['name'])}', row['signature']));
  }
  sections.add(_table('DEFECTS AND DISPOSITIONS', const ['Defect', 'Status', 'Resolution'], [
    for (final defect in _rows(workspace['defects']))
      [_value(defect['description']), _value(defect['status']), _value(defect['resolution'])],
  ]));
  sections.add(pw.SizedBox(height: 8));
  sections.add(pw.Text('REMARKS: ${_value(log['remarks'])}', style: const pw.TextStyle(fontSize: 8)));
  if (b412 && _value(b412Data['discrepancyRemarks']).isNotEmpty) {
    sections.add(pw.Text('BELL 412 DISCREPANCY REMARKS: ${_value(b412Data['discrepancyRemarks'])}',
      style: const pw.TextStyle(fontSize: 8)));
  }
  for (final (label, key) in [('Released by', 'releasedBy'), ('Accepted by', 'acceptedBy'),
    ('Submitted by', 'submittedBy'), ('Completed by', 'completedBy')]) {
    final person = _map(log[key]);
    sections.add(_signature('$label - ${_value(person['name'])}', person['signature']));
  }
  sections.add(_table('WORKFLOW AND AMENDMENTS', const ['Step', 'Details'], [
    for (final row in [..._rows(log['workflowHistory']), ..._rows(workspace['amendments'])])
      [_value(row['action'] ?? row['field']), _value(row['comment'] ?? row['reason'] ?? row['correction'])],
  ]));
  document.addPage(pw.MultiPage(pageFormat: PdfPageFormat.a4,
    margin: const pw.EdgeInsets.symmetric(horizontal: 18, vertical: 14),
    footer: (context) => pw.Align(alignment: pw.Alignment.centerRight,
      child: pw.Text('Page ${context.pageNumber} of ${context.pagesCount}', style: const pw.TextStyle(fontSize: 8))),
    build: (_) => sections));
  return document.save();
}

Future<void> shareFlightLogTemplatePdf(Map<String, dynamic> log, Map<String, dynamic> workspace) async {
  final bytes = await buildFlightLogTemplatePdf(log, workspace);
  await Printing.sharePdf(bytes: bytes, filename: 'Flight-Log-${_value(log['controlNo']).isEmpty ? _value(log['_id']) : _value(log['controlNo'])}.pdf');
}
