import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:airms_flutter/src/flight_pdf.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  for (final aircraftType in ['AS350 B3', 'B412EP']) {
    test('builds the $aircraftType flight record with servicing and history', () async {
      final log = <String, dynamic>{
        '_id': 'fixture', 'controlNo': 'FL-001', 'rpc': 'RP-C1234',
        'aircraftType': aircraftType, 'date': '2026-10-11',
        'legs': [{'stations': [{'from': 'Manila', 'to': 'Clark'}],
          'blockTimeOff': '08:00', 'blockTimeOn': '09:00', 'passengers': 2}],
        'fuelServicing': [{'date': '2026-10-11', 'mainAdd': '12', 'fuelType': 'truck'}],
        'oilServicing': [{'date': '2026-10-11', 'engineAdd': '1'}],
        if (aircraftType == 'B412EP') 'b412Data': {
          'passengerRows': [{'legs': ['A', 'B', 'C', 'D', 'E', 'F']}],
          'componentData': {'airframeNextInspectionDueAt': '1200', 'engineNextInspectionDueAt': '1400'},
          'fuelServicing': [{'mainTankAdded': '12', 'supplySystem1': '20',
            'supplySystem2': '18', 'remarks': 'Serviced', 'refuelerName': 'Fixture'}],
          'oilServicing': [{'engine1': {'added': '1'}, 'engine2': {'added': '2'},
            'mrGearbox': {'added': '3'}, 'reductionGearbox': {'added': '4'},
            'tr42Gearbox': {'added': '5'}, 'tr90Gearbox': {'added': '6'}}],
          'discrepancyRemarks': 'Fixture remark',
        },
        'workflowHistory': [{'action': 'release', 'comment': 'Ready'}],
      };
      final bytes = await buildFlightLogTemplatePdf(log, {
        'defects': [{'description': 'Fixture defect', 'status': 'rectified', 'resolution': 'Fixed'}],
      });
      expect(bytes.length, greaterThan(1000));
      expect(ascii.decode(bytes.take(4).toList()), '%PDF');
    });
  }
}
