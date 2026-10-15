import 'dart:async';
import 'dart:math';
import 'dart:io';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'auth.dart';

final pushPreferenceChanged = ValueNotifier<bool?>(null);

@pragma('vm:entry-point')
Future<void> airmsBackgroundMessage(RemoteMessage message) async {
  try { await Firebase.initializeApp(); } catch (_) {}
}

class PushService {
  PushService(this.session, this.onOpen, this.onForeground);
  final AirmsSession session;
  final ValueChanged<Map<String, dynamic>> onOpen;
  final ValueChanged<RemoteMessage> onForeground;
  final subscriptions = <StreamSubscription<dynamic>>[];
  bool started = false;

  String moduleFor(Map<String, dynamic> data) => switch ('${data['module'] ?? ''}'.toLowerCase()) {
    'flight-logs' => 'Flight Logs', 'pre-flight inspections' => 'Pre-Flight Inspection',
    'post-inspections' || 'post-flight inspections' => 'Post-Flight Inspection',
    'tasks' => 'Tasks', 'messages' => 'Messages',
    'parts-requisition' || 'parts-requisitions' => 'Parts Requisition', _ => '',
  };
  Future<void> start() async {
    if (started || Firebase.apps.isEmpty || session.user == null) return;
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool('notificationsEnabled') == false) return;
    started = true;
    try {
      final messaging = FirebaseMessaging.instance;
      final permission = await messaging.requestPermission();
      if (permission.authorizationStatus == AuthorizationStatus.denied) { started = false; return; }
      final token = await messaging.getToken();
      if (token != null) await register(token);
      subscriptions.add(messaging.onTokenRefresh.listen((token) async {
        final prefs = await SharedPreferences.getInstance();
        if (prefs.getBool('notificationsEnabled') != false) await register(token);
      }));
      subscriptions.add(FirebaseMessaging.onMessage.listen((message) async {
        final prefs = await SharedPreferences.getInstance();
        if (prefs.getBool('notificationsEnabled') != false) onForeground(message);
      }));
      subscriptions.add(FirebaseMessaging.onMessageOpenedApp.listen((message) {
        onOpen(Map<String, dynamic>.from(message.data));
      }));
      final initial = await messaging.getInitialMessage();
      if (initial != null) onOpen(Map<String, dynamic>.from(initial.data));
    } catch (_) { started = false; }
  }
  Future<void> register(String token) async {
    final preferences = await SharedPreferences.getInstance();
    var deviceId = preferences.getString('airms_installation_id');
    if (deviceId == null) {
      final random = Random.secure();
      deviceId = List.generate(16, (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0')).join();
      await preferences.setString('airms_installation_id', deviceId);
    }
    await session.request('/api/user/register-mobile-push-device', method: 'POST', body: {
      'deviceId': deviceId, 'fcmToken': token, 'platform': Platform.isIOS ? 'ios' : 'android',
    });
  }
  Future<void> unregister() async {
    if (Firebase.apps.isEmpty) return;
    try { await FirebaseMessaging.instance.deleteToken(); } catch (_) {}
  }
  void dispose() { for (final subscription in subscriptions) { subscription.cancel(); } subscriptions.clear(); started = false; }
}
