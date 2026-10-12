import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'auth.dart';

class AirmsRealtime {
  AirmsRealtime(this.session, this.onEvent);
  final AirmsSession session;
  final void Function(String event, Map<String, dynamic> data) onEvent;
  WebSocket? socket;
  StreamSubscription<dynamic>? subscription;
  Timer? reconnect;
  bool disposed = false;
  int attempts = 0;
  bool get connected => socket?.readyState == WebSocket.open;

  Future<void> start() async {
    if (disposed || connected || session.accessToken == null) return;
    final base = Uri.parse(apiBase);
    final uri = base.replace(scheme: base.scheme == 'https' ? 'wss' : 'ws', path: '/ws', query: '');
    try {
      final connection = await WebSocket.connect(uri.toString(), protocols: ['airms', session.accessToken!]);
      if (disposed) { await connection.close(); return; }
      socket = connection;
      attempts = 0;
      subscription = connection.listen((raw) {
        try {
          final payload = jsonDecode('$raw');
          if (payload is! Map) return;
          final data = payload['data'];
          onEvent('${payload['event'] ?? ''}', data is Map ? Map<String, dynamic>.from(data) : {});
        } catch (_) {}
      }, onDone: scheduleReconnect, onError: (_) => scheduleReconnect(), cancelOnError: true);
    } catch (_) { scheduleReconnect(); }
  }
  void scheduleReconnect() {
    if (disposed) return;
    subscription?.cancel(); subscription = null;
    socket?.close(); socket = null;
    reconnect?.cancel();
    attempts++;
    final seconds = (1 << attempts.clamp(0, 5)).clamp(2, 30);
    reconnect = Timer(Duration(seconds: seconds), start);
  }
  void dispose() {
    disposed = true;
    reconnect?.cancel(); subscription?.cancel(); socket?.close();
    reconnect = null; subscription = null; socket = null;
  }
}
