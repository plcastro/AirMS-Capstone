import 'package:flutter_test/flutter_test.dart';
import 'package:airms_flutter/src/flight_logs.dart';

void main() {
  test('normalizes aircraft and workflow stages for flight log grouping', () {
    expect(flightAircraft({'rpc': ' rp-c123 '}), 'RP-C123');
    expect(flightAircraft({'aircraft': 'rp-c456'}), 'RP-C456');
    expect(flightAircraft({}), 'Unassigned aircraft');
    expect(flightStage({}), 'pending_release');
    expect(flightStage({'status': 'Released'}), 'pending_acceptance');
    expect(flightStage({'status': 'accepted', 'notifiedForCompletion': true}), 'submitted');
  });

  test('uses the most recent valid activity timestamp', () {
    final activity = flightActivity({
      'updatedAt': 'invalid',
      'createdAt': '2026-10-12T08:00:00Z',
      'date': '2026-10-01',
    });
    expect(activity, DateTime.utc(2026, 10, 12, 8));
  });
}
