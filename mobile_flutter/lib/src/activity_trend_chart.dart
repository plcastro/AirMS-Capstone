import 'dart:math' as math;
import 'package:flutter/material.dart';

const activitySeriesColors = <String, Color>{
  'create': Color(0xff389e0d), 'update': Color(0xff1677ff),
  'delete': Color(0xffcf1322), 'view': Color(0xff13c2c2),
  'export': Color(0xff595959), 'authentication': Color(0xff722ed1),
  'notification': Color(0xfffa8c16), 'other': Color(0xff8c8c8c),
};

class ActivityTrendChart extends StatelessWidget {
  const ActivityTrendChart({super.key, required this.days, required this.values, required this.selected});
  final List<String> days;
  final Map<String, Map<String, int>> values;
  final String selected;

  @override Widget build(BuildContext context) {
    final series = selected == 'all' ? activitySeriesColors.keys.toList() : [selected];
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(height: 155, width: double.infinity,
        child: CustomPaint(painter: _TrendPainter(days: days, values: values, series: series))),
      const SizedBox(height: 8),
      Wrap(spacing: 10, runSpacing: 6, children: [for (final key in series)
        Row(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 8, height: 8, decoration: BoxDecoration(
            color: activitySeriesColors[key], borderRadius: BorderRadius.circular(4))),
          const SizedBox(width: 4), Text(key, style: const TextStyle(fontSize: 11)),
        ])]),
    ]);
  }
}

class _TrendPainter extends CustomPainter {
  _TrendPainter({required this.days, required this.values, required this.series});
  final List<String> days, series;
  final Map<String, Map<String, int>> values;

  @override void paint(Canvas canvas, Size size) {
    const left = 22.0, right = 5.0, top = 8.0, bottom = 20.0;
    final width = math.max(1.0, size.width - left - right);
    final height = math.max(1.0, size.height - top - bottom);
    final axis = Paint()..color = const Color(0xffc9d2cc)..strokeWidth = 1;
    canvas.drawLine(const Offset(left, top), Offset(left, top + height), axis);
    canvas.drawLine(Offset(left, top + height), Offset(left + width, top + height), axis);
    final maxCount = days.fold<int>(1, (best, day) => math.max(best,
      series.fold<int>(0, (sum, key) => sum + (values[day]?[key] ?? 0))));
    final textPainter = TextPainter(textDirection: TextDirection.ltr);
    void label(String value, Offset offset) {
      textPainter.text = TextSpan(text: value, style: const TextStyle(fontSize: 9, color: Color(0xff5f6b63)));
      textPainter.layout(); textPainter.paint(canvas, offset);
    }
    label('$maxCount', const Offset(0, top));
    label('0', Offset(10, top + height - 5));
    if (days.isEmpty) return;
    label(days.first.substring(5), Offset(left, top + height + 4));
    if (days.length > 1) label(days.last.substring(5), Offset(left + width - 28, top + height + 4));
    final base = <String, int>{for (final day in days) day: 0};
    for (final key in series) {
      final color = activitySeriesColors[key] ?? Colors.grey;
      final upper = <Offset>[];
      final lower = <Offset>[];
      for (var index = 0; index < days.length; index++) {
        final day = days[index];
        final x = left + width * (days.length == 1 ? .5 : index / (days.length - 1));
        final below = base[day] ?? 0;
        final above = below + (values[day]?[key] ?? 0);
        lower.add(Offset(x, top + height * (1 - below / maxCount)));
        upper.add(Offset(x, top + height * (1 - above / maxCount)));
        base[day] = above;
      }
      if (upper.isEmpty) continue;
      final area = Path()..moveTo(upper.first.dx, upper.first.dy);
      for (final point in upper.skip(1)) { area.lineTo(point.dx, point.dy); }
      for (final point in lower.reversed) { area.lineTo(point.dx, point.dy); }
      area.close();
      canvas.drawPath(area, Paint()..color = color.withValues(alpha: .22));
      final line = Path()..moveTo(upper.first.dx, upper.first.dy);
      for (final point in upper.skip(1)) { line.lineTo(point.dx, point.dy); }
      canvas.drawPath(line, Paint()..color = color..strokeWidth = 1.5..style = PaintingStyle.stroke);
    }
  }

  @override bool shouldRepaint(covariant _TrendPainter oldDelegate) =>
    oldDelegate.days != days || oldDelegate.values != values || oldDelegate.series != series;
}
