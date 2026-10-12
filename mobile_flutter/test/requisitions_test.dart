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
    expect(events.map((event) => event['label']), ['Requested', 'Delivered']);
    expect(events.last['details'], 'At warehouse');
  });
}
