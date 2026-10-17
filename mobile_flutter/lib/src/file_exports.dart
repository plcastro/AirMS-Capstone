import 'dart:convert';
import 'package:http/http.dart' as http;
import 'auth.dart';
import 'save_file.dart';

Future<void> openAuthenticatedExport(AirmsSession session, String path, String fileName,
    {String method = 'GET', Object? body}) async {
  final uri = Uri.parse('$apiBase$path');
  Future<http.Response> send() => method == 'POST'
    ? http.post(uri, headers: session.headers(), body: jsonEncode(body))
    : http.get(uri, headers: session.headers());
  var response = await send();
  if (response.statusCode == 401 && await session.refresh() != null) response = await send();
  if (response.statusCode >= 400) throw ApiException('${decodeResponse(response)['message'] ?? 'Export failed'}');
  final safeName = fileName.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
  await saveAndOpenFile(safeName, response.bodyBytes,
    response.headers['content-type'] ?? 'application/octet-stream');
}
