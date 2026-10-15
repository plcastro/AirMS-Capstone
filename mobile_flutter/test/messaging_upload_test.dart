import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:airms_flutter/src/messaging_upload.dart';
import 'package:airms_flutter/src/auth.dart';
import 'package:airms_flutter/src/messaging.dart';
import 'package:image/image.dart' as img;

void main() {
  test('attachment validation follows message MIME and size rules', () {
    expect(
      messageMime('report.DOCX'),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(
      messageAttachmentError('image.png', maxMessageAttachmentBytes),
      isNull,
    );
    expect(
      messageAttachmentError('image.png', maxMessageAttachmentBytes + 1),
      'image.png is larger than 10 MB.',
    );
    expect(
      messageAttachmentError('script.exe', 10),
      'script.exe is not a supported file type.',
    );
    expect(
      messageUploadError(
        const ApiException('File too large. Maximum size is 10MB.'),
      ),
      'Each attachment must be 10 MB or smaller.',
    );
  });

  test('blob path is user scoped and sanitizes file name', () {
    expect(
      messageBlobPath('user123', 'my ? photo.png', 2, 42),
      'messages/user123/42-2-my-_-photo.png',
    );
    expect(MessageBlobFile('a.txt', Uint8List.fromList([1])).bytes.length, 1);
  });

  test(
    'remote upload requests a scoped token then puts bytes directly',
    () async {
      final requests = <http.Request>[];
      final client = MockClient((request) async {
        requests.add(request);
        if (requests.length == 1) {
          return http.Response(
            '{"clientToken":"vercel_blob_client_test"}',
            200,
          );
        }
        return http.Response(
          '{"pathname":"messages/user123/file.txt","contentType":"text/plain"}',
          200,
        );
      });
      final session = AirmsSession()..accessToken = 'test';
      final uploaded = await uploadMessageBlobs(session, 'user123', [
        MessageBlobFile('file.txt', Uint8List.fromList([65])),
      ], client: client);
      expect(requests[0].url.path, '/api/messages/attachments/upload');
      expect(requests[0].method, 'POST');
      expect(requests[0].body, contains('blob.generate-client-token'));
      expect(requests[1].url.host, 'vercel.com');
      expect(requests[1].method, 'PUT');
      expect(
        requests[1].headers['authorization'],
        'Bearer vercel_blob_client_test',
      );
      expect(requests[1].bodyBytes, [65]);
      expect(uploaded.single, {
        'pathname': 'messages/user123/file.txt',
        'name': 'file.txt',
        'mimeType': 'text/plain',
        'size': 1,
      });
      client.close();
    },
  );

  test('conversation preview includes sender and attachment count', () {
    expect(messagingInitials({'firstName': 'Jane', 'lastName': 'Doe'}), 'JD');
    expect(messagingInitials({}), 'U');
    final target = ChatTarget(
      id: 'group1',
      title: 'Ops',
      type: 'group',
      group: {
        'members': [
          {'_id': 'user2', 'firstName': 'Jane', 'lastName': 'Doe'},
        ],
      },
      lastMessage: {
        'sender': 'user2',
        'attachments': [
          {'kind': 'image', 'name': 'a.png'},
          {'kind': 'image', 'name': 'b.png'},
        ],
      },
    );
    expect(
      conversationPreview(target, {'_id': 'user1'}),
      'Jane Doe: Photo: a.png +1',
    );
  });

  test('large picked images are resized before size validation', () {
    final original = Uint8List.fromList(
      img.encodeJpg(img.Image(width: 2000, height: 1000)),
    );
    final prepared = prepareChatAttachment(
      'photo.jpeg',
      original,
      'image/jpeg',
    );
    final decoded = img.decodeImage(prepared.bytes)!;
    expect(decoded.width, 1600);
    expect(decoded.height, 800);
    expect(prepared.name, 'photo.jpg');
    expect(prepared.mimeType, 'image/jpeg');
  });

  test(
    'local upload uses multipart attachments with target and body fields',
    () {
      final session = AirmsSession()..accessToken = 'test';
      final request = localMessageRequest(session, 'group123', true, 'hello', [
        MessageBlobFile('report.pdf', Uint8List.fromList([1, 2])),
      ]);
      expect(request.url.path, '/api/messages');
      expect(request.fields, {'conversationId': 'group123', 'body': 'hello'});
      expect(request.files.single.field, 'attachments');
      expect(request.files.single.filename, 'report.pdf');
      expect(request.files.single.contentType.toString(), 'application/pdf');
      expect(request.headers['Content-Type'], isNull);
    },
  );
}
