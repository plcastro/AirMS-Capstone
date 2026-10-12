import 'dart:async';
import 'dart:collection';
import 'package:flutter/material.dart';

class AirmsToast {
  AirmsToast._();
  static final messages = ValueNotifier<String?>(null);
  static final Queue<String> _queue = Queue<String>();
  static Timer? _timer;
  static String? _recent;
  static DateTime? _recentAt;

  static void show(Object? message) {
    final value = '${message ?? ''}'.trim();
    if (value.isEmpty) return;
    _recent = value;
    _recentAt = DateTime.now();
    _queue.add(value);
    _advance();
  }

  static String? get recent => _recentAt != null &&
      DateTime.now().difference(_recentAt!) < const Duration(milliseconds: 1800)
      ? _recent : null;

  static void replayRecent() {
    final value = recent;
    if (value != null && messages.value != value && !_queue.contains(value)) show(value);
  }

  static void _advance() {
    if (_timer != null || _queue.isEmpty) return;
    messages.value = _queue.removeFirst();
    _timer = Timer(const Duration(seconds: 2), () {
      messages.value = null;
      _timer = null;
      _advance();
    });
  }
}

/// Put above Navigator in MaterialApp.builder so dialogs cannot hide messages.
class AirmsToastHost extends StatelessWidget {
  const AirmsToastHost({super.key, required this.child});
  final Widget child;
  @override Widget build(BuildContext context) => Stack(children: [
    child,
    ValueListenableBuilder<String?>(valueListenable: AirmsToast.messages,
      builder: (context, message, _) => message == null
        ? const SizedBox.shrink()
        : Positioned(left: 20, right: 20, bottom: 32,
            child: SafeArea(child: IgnorePointer(child: Material(
              color: const Color(0xff244d3b), elevation: 12,
              borderRadius: BorderRadius.circular(8),
              child: Padding(padding: const EdgeInsets.all(16),
                child: Text(message, style: const TextStyle(color: Colors.white))),
            )))),
    ),
  ]);
}
