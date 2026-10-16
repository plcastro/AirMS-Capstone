import 'package:flutter_test/flutter_test.dart';
import 'package:airms_flutter/src/requisitions.dart';

void main() {
  test('legacy stock statuses normalize without changing stored values', () {
    expect(normalizeItemStatus('Ordered'), 'In Stock');
    expect(normalizeItemStatus('To Be Ordered'), 'Out of Stock');
    expect(normalizeItemStatus('unknown'), 'Pending Check');
    expect(itemDisplayStatus({'status': 'Delivered'}, {'stockStatus': 'In Stock'}), 'Delivered');
    expect(requisitionLabel(itemDisplayStatus({'status': 'Closed'}, {'stockStatus': 'Approved'})), 'Received');
  });

  test('timeline merges legacy events and history without duplicates', () {
    final events = requisitionTimeline({
      'dateRequested': '2026-01-01T00:00:00Z',
      'deliveredAt': '2026-01-02T00:00:00Z',
      'history': [
        {'label': 'Delivered', 'at': '2026-01-02T00:00:00Z', 'details': 'At warehouse'},
      ],
    });
    expect(events.map((event) => event['label']), ['Requested', 'Ready for pickup']);
    expect(events.last['details'], 'At warehouse');
  });
  test('visibility and action permissions follow owner and role', () {
    final record = {'staff': {'requisitionerId': '7'}, 'status': 'Delivered'};
    expect(ownsRequisition({'id': '7'}, record), isTrue);
    expect(canActOnRequisition({'id': '7', 'jobTitle': 'mechanic'}, record, 'confirm'), isTrue);
    expect(canActOnRequisition({'id': '8', 'access': 'admin staff'}, record, 'confirm'), isTrue);
    expect(canActOnRequisition({'id': '8', 'jobTitle': 'officer-in-charge'}, record, 'confirm'), isFalse);
    expect(followUpTarget(record), 'requester');
  });
  test('card text uses item details and first purpose', () {
    final record = {'wrsNo': 'WRS-1', 'aircraft': 'RP-1', 'status': 'Requested',
      'items': [{'particular': 'Bolt', 'quantity': 2, 'unitOfMeasure': 'PC', 'purpose': 'Repair'}]};
    expect(requisitionItemsText(record), 'Bolt x 2 PC');
    expect(requisitionPurpose(record), 'Repair');
    expect(requisitionSearchText(record), contains('wrs-1 rp-1'));
  });
  test('positive fractional quantities match the RN request validation', () {
    expect(validRequisitionQuantity('0.5'), isTrue);
    expect(validRequisitionQuantity('0'), isFalse);
    expect(validRequisitionQuantity('-1'), isFalse);
    expect(validRequisitionQuantity('bad'), isFalse);
  });
}
