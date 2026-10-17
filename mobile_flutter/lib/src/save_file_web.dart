// Browser downloads need a short lived object URL because the response is authenticated.
// ignore_for_file: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:typed_data';

Future<void> saveAndOpenFile(
  String name,
  List<int> bytes,
  String mimeType,
) async {
  final blob = html.Blob([Uint8List.fromList(bytes)], mimeType);
  final url = html.Url.createObjectUrlFromBlob(blob);
  try {
    final link = html.AnchorElement(href: url)..download = name;
    html.document.body!.append(link);
    link.click();
    link.remove();
  } finally {
    await Future<void>.delayed(const Duration(seconds: 1));
    html.Url.revokeObjectUrl(url);
  }
}
