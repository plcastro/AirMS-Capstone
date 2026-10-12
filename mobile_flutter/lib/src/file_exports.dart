import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import 'auth.dart';

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
  final cache = await getTemporaryDirectory();
  final file = File('${cache.path}${Platform.pathSeparator}$safeName');
  await file.writeAsBytes(response.bodyBytes, flush: true);
  final opened = await OpenFile.open(file.path);
  if (opened.type != ResultType.done) throw ApiException(opened.message);
}
