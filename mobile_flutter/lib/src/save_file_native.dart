import 'dart:io';
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import 'auth.dart';

Future<void> saveAndOpenFile(
  String name,
  List<int> bytes,
  String mimeType,
) async {
  final cache = await getTemporaryDirectory();
  final file = File('${cache.path}${Platform.pathSeparator}$name');
  await file.writeAsBytes(bytes, flush: true);
  final opened = await OpenFile.open(file.path);
  if (opened.type != ResultType.done) throw ApiException(opened.message);
}
