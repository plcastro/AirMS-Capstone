import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const apiBase = String.fromEnvironment('AIRMS_API_BASE', defaultValue: 'https://api.airms.online');
String airmsDeviceModel = kIsWeb ? 'Web' : Platform.operatingSystem;

Future<void> loadAirmsDeviceModel() async {
  try {
    final info = DeviceInfoPlugin();
    if (kIsWeb) return;
    if (Platform.isAndroid) {
      final android = await info.androidInfo;
      airmsDeviceModel = '${android.manufacturer} ${android.model}'.trim();
    } else if (Platform.isIOS) {
      final ios = await info.iosInfo;
      airmsDeviceModel = ios.utsname.machine;
    }
  } catch (_) {}
}

class ApiException implements Exception {
  const ApiException(this.message);
  final String message;
  @override String toString() => message;
}

Map<String, dynamic> decodeResponse(http.Response response) {
  try {
    final value = jsonDecode(response.body);
    return value is Map<String, dynamic> ? value : {'data': value};
  } catch (_) { return {'message': response.body}; }
}

Future<Map<String, dynamic>> publicPost(String path, Object body,
    {Map<String, String> headers = const {}}) async {
  final response = await http.post(Uri.parse('$apiBase$path'),
      headers: {'Content-Type': 'application/json', 'x-device-model': airmsDeviceModel, ...headers}, body: jsonEncode(body));
  final data = decodeResponse(response);
  if (response.statusCode >= 400) throw ApiException('${data['message'] ?? 'Request failed'}');
  return data;
}

class AirmsSession extends ChangeNotifier {
  static const storage = FlutterSecureStorage();
  static const idleLimit = Duration(minutes: 30);
  Map<String, dynamic>? user;
  Map<String, dynamic> session = {};
  String? accessToken;
  String? refreshToken;
  DateTime lastActivityAt = DateTime.now();

  bool get idleExpired => DateTime.now().difference(lastActivityAt) >= idleLimit;
  Future<void> markClientActivity() async {
    if (idleExpired) return;
    lastActivityAt = DateTime.now();
    await storage.write(key: 'lastActivityAt', value: '${lastActivityAt.millisecondsSinceEpoch}');
  }

  Future<void> restore() async {
    try {
      accessToken = await storage.read(key: 'accessToken');
      refreshToken = await storage.read(key: 'refreshToken');
      final savedUser = await storage.read(key: 'user');
      final savedSession = await storage.read(key: 'session');
      final savedActivity = int.tryParse(await storage.read(key: 'lastActivityAt') ?? '');
      if (savedActivity != null) lastActivityAt = DateTime.fromMillisecondsSinceEpoch(savedActivity);
      if (savedUser != null) user = Map<String, dynamic>.from(jsonDecode(savedUser));
      if (savedSession != null) session = Map<String, dynamic>.from(jsonDecode(savedSession));
      if (user != null && idleExpired) { await logout(); return; }
      if (user != null && accessToken == null && await refresh() == null) user = null;
    } catch (_) { user = null; }
    notifyListeners();
  }

  Future<void> acceptLogin(Map<String, dynamic> data,
      {required String base, required Map<String, dynamic> location}) async {
    user = Map<String, dynamic>.from(data['user'] as Map);
    accessToken = '${data['token'] ?? data['accessToken']}';
    refreshToken = data['refreshToken']?.toString();
    session = {
      ...?data['session'] as Map<String, dynamic>?,
      'sessionId': data['sessionId'] ?? (data['session'] as Map?)?['sessionId'],
      'base': base, 'location': location, 'platform': 'MOBILE',
    };
    lastActivityAt = DateTime.now();
    await storage.write(key: 'lastActivityAt', value: '${lastActivityAt.millisecondsSinceEpoch}');
    await storage.write(key: 'user', value: jsonEncode(user));
    await storage.write(key: 'accessToken', value: accessToken);
    if (refreshToken != null) await storage.write(key: 'refreshToken', value: refreshToken);
    await storage.write(key: 'session', value: jsonEncode(session));
    notifyListeners();
  }

  Future<String?> refresh() async {
    if (refreshToken == null || idleExpired) return null;
    try {
      final response = await http.post(Uri.parse('$apiBase/api/user/refresh-token'),
          headers: headers(auth: false), body: jsonEncode({'refreshToken': refreshToken}));
      final data = decodeResponse(response);
      if (response.statusCode >= 400) return null;
      accessToken = (data['token'] ?? data['accessToken'])?.toString();
      refreshToken = (data['refreshToken'] ?? refreshToken)?.toString();
      if (accessToken != null) {
        await storage.write(key: 'accessToken', value: accessToken);
        await storage.write(key: 'refreshToken', value: refreshToken);
      }
      return accessToken;
    } catch (_) { return null; }
  }

  Map<String, String> headers({bool auth = true}) {
    final location = session['location'] as Map? ?? {};
    final coordinates = location['coordinates'] as Map? ?? {};
    return {
      'Content-Type': 'application/json', 'x-platform': 'MOBILE',
      'x-device-platform': kIsWeb ? 'WEB' : Platform.isIOS ? 'MOBILE_IOS' : 'MOBILE_ANDROID',
      'x-device-model': airmsDeviceModel,
      'x-client-active-at': '${lastActivityAt.millisecondsSinceEpoch}',
      if (session['base'] != null) 'x-base': '${session['base']}',
      if (session['sessionId'] != null) 'x-session-id': '${session['sessionId']}',
      if (location['text'] != null) 'x-location-text': '${location['text']}',
      if (coordinates['latitude'] != null) 'x-location-latitude': '${coordinates['latitude']}',
      if (coordinates['longitude'] != null) 'x-location-longitude': '${coordinates['longitude']}',
      if (auth && accessToken != null) 'Authorization': 'Bearer $accessToken',
    };
  }

  Future<dynamic> request(String path, {String method = 'GET', Object? body,
      Map<String, String> extraHeaders = const {}}) async {
    if (idleExpired && path != '/api/user/logout') throw const ApiException('Session expired due to inactivity. Sign in again.');
    Future<http.Response> send() {
      final uri = Uri.parse('$apiBase$path');
      return switch (method) {
        'POST' => http.post(uri, headers: {...headers(), ...extraHeaders}, body: jsonEncode(body)),
        'PUT' => http.put(uri, headers: {...headers(), ...extraHeaders}, body: jsonEncode(body)),
        'PATCH' => http.patch(uri, headers: {...headers(), ...extraHeaders}, body: jsonEncode(body)),
        'DELETE' => http.delete(uri, headers: {...headers(), ...extraHeaders}),
        _ => http.get(uri, headers: {...headers(), ...extraHeaders}),
      };
    }
    var response = await send();
    if (response.statusCode == 401 && await refresh() != null) response = await send();
    final data = decodeResponse(response);
    if (response.statusCode >= 400) throw ApiException('${data['message'] ?? 'Request failed (${response.statusCode})'}');
    return data;
  }

  Future<void> logout() async {
    try { await request('/api/user/logout', method: 'POST', body: {'refreshToken': refreshToken}); } catch (_) {}
    for (final key in ['user', 'accessToken', 'refreshToken', 'session', 'lastActivityAt']) {
      await storage.delete(key: key);
    }
    user = null; accessToken = null; refreshToken = null; session = {};
    notifyListeners();
  }

  Future<void> updateUser(Map<String, dynamic> changes) async {
    user = {...?user, ...changes};
    await storage.write(key: 'user', value: jsonEncode(user));
    notifyListeners();
  }
}

Future<Map<String, dynamic>> loginLocation() async {
  if (!await Geolocator.isLocationServiceEnabled()) throw const ApiException('Turn on location services to sign in.');
  var permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
  if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
    throw const ApiException('Location permission is required to sign in.');
  }
  final position = await Geolocator.getCurrentPosition();
  final coordinates = {'latitude': position.latitude, 'longitude': position.longitude};
  final coordinateText = '${position.latitude.toStringAsFixed(6)}, ${position.longitude.toStringAsFixed(6)}';
  var text = coordinateText;
  try {
    final response = await http.get(Uri.parse('$apiBase/api/user/reverse-geocode').replace(queryParameters: {
      'latitude': '${position.latitude}', 'longitude': '${position.longitude}',
    }));
    final decoded = decodeResponse(response);
    if (response.statusCode < 400 && '${decoded['text'] ?? ''}'.trim().isNotEmpty) text = '${decoded['text']}';
  } catch (_) {}
  return {'coordinates': coordinates, 'coordinateText': coordinateText, 'text': text};
}

Map<String, String> loginLocationHeaders(Map<String, dynamic>? location) {
  final coordinates = location?['coordinates'] as Map? ?? {};
  String? coordinate(Object? value) {
    final number = value is num ? value : num.tryParse('$value');
    return number?.toStringAsFixed(6);
  }
  final latitude = coordinate(coordinates['latitude']);
  final longitude = coordinate(coordinates['longitude']);
  final text = location?['text'];
  return {
    'x-location-latitude': ?latitude,
    'x-location-longitude': ?longitude,
    if (text != null && '$text'.isNotEmpty) 'x-location-text': '$text',
  };
}

Future<SharedPreferences> preferences() => SharedPreferences.getInstance();
