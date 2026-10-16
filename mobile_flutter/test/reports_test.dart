import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/widgets.dart';
import 'package:airms_flutter/src/reports.dart';
import 'package:airms_flutter/src/pdf_exports.dart';

void main() {
  test('report drilldown separates completed, due soon, and overdue', () {
    final now = DateTime.utc(2026, 10, 13, 12);
    expect(reportTaskBucket({'status': 'Approved'}, now), 'completed');
    expect(
      reportTaskBucket({
        'status': 'Pending',
        'dueDate': '2026-10-15T12:00:00Z',
      }, now),
      'dueSoon',
    );
    expect(
      reportTaskBucket({
        'status': 'Pending',
        'dueDate': '2026-10-12T12:00:00Z',
      }, now),
      'overdue',
    );
    expect(
      reportTaskBucket({
        'status': 'Pending',
        'dueDate': '2026-10-20T12:00:00Z',
      }, now),
      'other',
    );
  });

  test('due soon uses calendar days, including earlier today', () {
    final now = DateTime(2026, 10, 13, 23, 30);
    expect(
      reportTaskBucket({
        'status': 'Pending',
        'dueDate': '2026-10-13T00:00:00',
      }, now),
      'dueSoon',
    );
    expect(
      reportTaskBucket({
        'status': 'Pending',
        'dueDate': '2026-10-16T23:59:00',
      }, now),
      'dueSoon',
    );
    expect(
      reportTaskBucket({
        'status': 'Pending',
        'dueDate': '2026-10-17T00:00:00',
      }, now),
      'other',
    );
  });

  test('report distributions exclude unknown and overall labels', () {
    final rows = [
      {'status': 'Approved'},
      {'status': 'Approved'},
      {'status': 'Pending'},
      {'status': 'UNKNOWN'},
      {'status': 'overall'},
      {'status': 'un_assigned'},
    ];
    expect(reportCounts(rows, (row) => '${row['status']}'), {
      'Approved': 2,
      'Pending': 1,
      'un_assigned': 1,
    });
  });

  test('maintenance history retains unknown status but excludes totals', () {
    expect(
      reportHistoryCounts([
        {'status': null},
        {'status': 'ALL'},
        {'status': 'in_progress'},
      ]),
      {'Unknown': 1, 'in progress': 1},
    );
  });

  test('module pie colors follow first encounter before count sorting', () {
    final rows = [
      {'status': 'Pending'},
      {'status': 'Approved'},
      {'status': 'Approved'},
    ];
    final counts = reportCounts(rows, (row) => '${row['status']}');
    expect(counts.keys.toList(), ['Approved', 'Pending']);
    expect(reportModuleColors(rows, (row) => '${row['status']}', counts.keys), [
      ReportDonut.palette[1],
      ReportDonut.palette[0],
    ]);
  });

  test('search ranks matching report titles ahead of related records', () {
    final cards = [
      ReportCardData(
        'Flight Log Report',
        'Logbook',
        const ['flight', 'aircraft'],
        const [],
        () => const SizedBox(),
        0,
      ),
      ReportCardData(
        'Maintenance History',
        'Performance',
        const ['history'],
        const [
          {'title': 'flight maintenance'},
        ],
        () => const SizedBox(),
        0,
      ),
    ];
    expect(
      rankReportCards(cards, 'flight').map((card) => card.title).toList(),
      ['Flight Log Report', 'Maintenance History'],
    );
  });

  test('export metadata matches the source report names and fallback', () {
    expect(
      reportFileName('pdf', DateTime(2026, 10, 16)),
      'ReportsAndAnalytics_2026-10-16.pdf',
    );
    expect(
      reportExecutorName({'firstName': 'Ada', 'lastName': 'Lovelace'}),
      'Ada Lovelace',
    );
    expect(reportExecutorName({'email': 'ada@example.com'}), 'ada@example.com');
    expect(reportExecutorName(null), 'Unknown User');
    expect(
      analyticsGeneratedAt(DateTime(2026, 10, 16, 14, 5)),
      '10/16/2026, 2:05 PM',
    );
  });

  test('report field fallbacks skip empty values', () {
    expect(reportFirstValue(['', null, 'RPC-101']), 'RPC-101');
    expect(reportFirstValue([false, 0], 'Unknown'), 'Unknown');
  });
}
