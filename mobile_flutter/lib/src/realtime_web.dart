// ignore_for_file: avoid_web_libraries_in_flutter
import 'dart:async';
import 'dart:convert';
import 'dart:html' as html;
import 'auth.dart';

class AirmsRealtime {
  AirmsRealtime(this.session, this.onEvent);
  final AirmsSession session;
  final void Function(String event, Map<String, dynamic> data) onEvent;
  html.WebSocket? socket;
  final subscriptions = <StreamSubscription<dynamic>>[];
  Timer? reconnect;
  bool disposed = false;
  int attempts = 0;
  bool get connected => socket?.readyState == html.WebSocket.OPEN;

  Future<void> start() async {
    if (disposed || connected || session.accessToken == null) return;
    final base = Uri.parse(apiBase);
    final uri = base.replace(
      scheme: base.scheme == 'https' ? 'wss' : 'ws',
      path: '/ws',
      query: '',
    );
    try {
      final connection = html.WebSocket(uri.toString(), [
        'airms',
        session.accessToken!,
      ]);
      if (disposed) {
        connection.close();
        return;
      }
      socket = connection;
      attempts = 0;
      subscriptions.add(
        connection.onMessage.listen((message) {
          try {
            final payload = jsonDecode('${message.data}');
            if (payload is! Map) return;
            final data = payload['data'];
            onEvent(
              '${payload['event'] ?? ''}',
              data is Map ? Map<String, dynamic>.from(data) : {},
            );
          } catch (_) {}
        }),
      );
      subscriptions.add(connection.onClose.listen((_) => scheduleReconnect()));
      subscriptions.add(connection.onError.listen((_) => scheduleReconnect()));
    } catch (_) {
      scheduleReconnect();
    }
  }

  void scheduleReconnect() {
    if (disposed) return;
    for (final subscription in subscriptions) {
      subscription.cancel();
    }
    subscriptions.clear();
    socket?.close();
    socket = null;
    reconnect?.cancel();
    attempts++;
    final seconds = (1 << attempts.clamp(0, 5)).clamp(2, 30);
    reconnect = Timer(Duration(seconds: seconds), start);
  }

  void dispose() {
    disposed = true;
    reconnect?.cancel();
    for (final subscription in subscriptions) {
      subscription.cancel();
    }
    subscriptions.clear();
    socket?.close();
    socket = null;
  }
}
