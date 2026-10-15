import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'auth.dart';

const maxMessageAttachments = 5;
const maxMessageAttachmentBytes = 10 * 1024 * 1024;
const messageMimeByExtension = <String, String>{
  'pdf': 'application/pdf',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'heic': 'image/heic',
  'heif': 'image/heif',
  'bmp': 'image/bmp',
  'avif': 'image/avif',
  'tif': 'image/tiff',
  'tiff': 'image/tiff',
  'txt': 'text/plain',
  'csv': 'text/csv',
  'doc': 'application/msword',
  'docx':
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

String messageMime(String name, [String? declared]) {
  final type = declared?.toLowerCase() ?? '';
  if (type.isNotEmpty && type != 'application/octet-stream') return type;
  return messageMimeByExtension[name.split('.').last.toLowerCase()] ??
      'application/octet-stream';
}

String? messageAttachmentError(String name, int size, [String? declared]) {
  if (size > maxMessageAttachmentBytes) return '$name is larger than 10 MB.';
  final mime = messageMime(name, declared);
  if (!mime.startsWith('image/') &&
      !const {
        'application/msword',
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/csv',
        'text/plain',
      }.contains(mime)) {
    return '$name is not a supported file type.';
  }
  return null;
}

String messageUploadError(Object error) {
  final message = '$error';
  if (RegExp(
    r'too large|maximum size|exceeds.*size|file too large',
    caseSensitive: false,
  ).hasMatch(message)) {
    return 'Each attachment must be 10 MB or smaller.';
  }
  return message.isEmpty
      ? 'Failed to upload attachment. Please try again.'
      : message;
}

bool get localMessageApi {
  final host = Uri.tryParse(apiBase)?.host;
  return {'localhost', '127.0.0.1', '10.0.2.2'}.contains(host);
}

String messageBlobPath(
  String userId,
  String name,
  int index,
  int milliseconds,
) {
  final safe = name
      .replaceAll(RegExp(r'[^\w.\-() ]+'), '_')
      .replaceAll(RegExp(r'\s+'), '-')
      .replaceAll(RegExp(r'^-+|-+$'), '');
  final short = safe.length > 120 ? safe.substring(0, 120) : safe;
  return 'messages/$userId/$milliseconds-$index-${short.isEmpty ? 'attachment' : short}';
}

class MessageBlobFile {
  const MessageBlobFile(this.name, this.bytes, [this.mimeType]);
  final String name;
  final Uint8List bytes;
  final String? mimeType;
}

http.MultipartRequest localMessageRequest(
  AirmsSession session,
  String targetId,
  bool group,
  String body,
  List<MessageBlobFile> files,
) {
  if (files.length > maxMessageAttachments) {
    throw const ApiException('You can attach up to 5 files per message.');
  }
  final request = http.MultipartRequest(
    'POST',
    Uri.parse('$apiBase/api/messages'),
  );
  request.headers.addAll({...session.headers()}..remove('Content-Type'));
  request.fields[group ? 'conversationId' : 'recipientId'] = targetId;
  request.fields['body'] = body;
  for (final file in files) {
    final invalid = messageAttachmentError(
      file.name,
      file.bytes.length,
      file.mimeType,
    );
    if (invalid != null) throw ApiException(invalid);
    request.files.add(
      http.MultipartFile.fromBytes(
        'attachments',
        file.bytes,
        filename: file.name,
        contentType: MediaType.parse(messageMime(file.name, file.mimeType)),
      ),
    );
  }
  return request;
}

/// Mirrors the Vercel Blob client token handshake followed by a direct PUT.
Future<List<Map<String, dynamic>>> uploadMessageBlobs(
  AirmsSession session,
  String userId,
  List<MessageBlobFile> files, {
  http.Client? client,
}) async {
  final transport = client ?? http.Client();
  try {
    if (files.length > maxMessageAttachments) {
      throw const ApiException('You can attach up to 5 files per message.');
    }
    final uploaded = <Map<String, dynamic>>[];
    for (final entry in files.asMap().entries) {
      final file = entry.value;
      final validation = messageAttachmentError(
        file.name,
        file.bytes.length,
        file.mimeType,
      );
      if (validation != null) throw ApiException(validation);
      final mime = messageMime(file.name, file.mimeType);
      final pathname = messageBlobPath(
        userId,
        file.name,
        entry.key,
        DateTime.now().millisecondsSinceEpoch,
      );
      Future<http.Response> tokenRequest() => transport.post(
        Uri.parse('$apiBase/api/messages/attachments/upload'),
        headers: session.headers(),
        body: jsonEncode({
          'type': 'blob.generate-client-token',
          'payload': {
            'pathname': pathname,
            'clientPayload': null,
            'multipart': false,
          },
        }),
      );
      var tokenResponse = await tokenRequest();
      if (tokenResponse.statusCode == 401 && await session.refresh() != null) {
        tokenResponse = await tokenRequest();
      }
      final tokenData = decodeResponse(tokenResponse);
      if (tokenResponse.statusCode >= 400) {
        throw ApiException(
          '${tokenData['message'] ?? 'Failed to retrieve the client token'}',
        );
      }
      final token = tokenData['clientToken'];
      if (token is! String || !token.startsWith('vercel_blob_client_')) {
        throw const ApiException('Failed to retrieve the client token');
      }
      final storeId = token.split('_').length > 3 ? token.split('_')[3] : '';
      final response = await transport.put(
        Uri.https('vercel.com', '/api/blob/', {'pathname': pathname}),
        headers: {
          'Authorization': 'Bearer $token',
          'x-vercel-blob-access': 'public',
          'x-vercel-blob-store-id': storeId,
          'x-api-version': '12',
          'x-api-blob-request-id':
              '$storeId:${DateTime.now().millisecondsSinceEpoch}:${entry.key}',
          'x-api-blob-request-attempt': '0',
          'x-content-type': mime,
          'Content-Type': mime,
        },
        body: file.bytes,
      );
      final blob = decodeResponse(response);
      if (response.statusCode >= 400) {
        throw ApiException(
          '${blob['message'] ?? 'Failed to upload attachment. Please try again.'}',
        );
      }
      if (blob['pathname'] is! String) {
        throw const ApiException(
          'Failed to upload attachment. Please try again.',
        );
      }
      uploaded.add({
        'pathname': blob['pathname'],
        'name': file.name,
        'mimeType': blob['contentType'] ?? mime,
        'size': file.bytes.length,
      });
    }
    return uploaded;
  } finally {
    if (client == null) transport.close();
  }
}
