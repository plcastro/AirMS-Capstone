import 'dart:convert';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'auth.dart';

class FlightSignature {
  const FlightSignature(this.image, this.pin);
  final String image, pin;
}

Future<FlightSignature?> collectFlightSignature(BuildContext context, AirmsSession session,
    {String? existing, bool requirePin = true}) => showDialog<FlightSignature>(
  context: context, barrierDismissible: false,
  builder: (_) => _SignatureDialog(session: session, existing: existing, requirePin: requirePin));

class _SignatureDialog extends StatefulWidget {
  const _SignatureDialog({required this.session, this.existing, required this.requirePin});
  final AirmsSession session;
  final String? existing;
  final bool requirePin;
  @override State<_SignatureDialog> createState() => _SignatureDialogState();
}
class _SignatureDialogState extends State<_SignatureDialog> {
  final points = <Offset?>[];
  final pin = TextEditingController();
  final key = GlobalKey();
  bool busy = false;
  String error = '';
  @override void dispose() { pin.dispose(); super.dispose(); }
  Future<void> submit() async {
    if (widget.requirePin && !RegExp(r'^\d{6}$').hasMatch(pin.text)) { setState(() => error = 'Enter your six-digit PIN.'); return; }
    if ((widget.existing ?? '').isEmpty && points.length < 2) { setState(() => error = 'Draw your signature.'); return; }
    setState(() { busy = true; error = ''; });
    try {
      if (widget.requirePin) {
        final userId = '${widget.session.user?['id'] ?? widget.session.user?['_id'] ?? ''}';
        if (userId.isEmpty) throw const ApiException('Sign in again to verify your PIN.');
        await widget.session.request('/api/user/verify-pin/$userId', method: 'POST', body: {'pin': pin.text});
      }
      String image = widget.existing ?? '';
      if (image.isEmpty) {
        final recorder = ui.PictureRecorder();
        final canvas = Canvas(recorder);
        final size = key.currentContext!.size!;
        canvas.drawColor(Colors.white, BlendMode.src);
        _drawSignature(canvas, points);
        final result = await recorder.endRecording().toImage(size.width.ceil(), size.height.ceil());
        final bytes = await result.toByteData(format: ui.ImageByteFormat.png);
        image = 'data:image/png;base64,${base64Encode(bytes!.buffer.asUint8List())}';
      }
      if (mounted) Navigator.pop(context, FlightSignature(image, pin.text));
    } catch (e) { if (mounted) setState(() { busy = false; error = '$e'; }); }
  }
  @override Widget build(BuildContext context) => AlertDialog(
    title: const Text('Sign and confirm'),
    content: SizedBox(width: 380, child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
      Text(widget.existing == null
        ? widget.requirePin ? 'Draw your signature, then enter your six-digit PIN.' : 'Draw your signature.'
        : widget.requirePin ? 'Confirm the existing Pre-Flight signature with your six-digit PIN.' : 'Confirm the existing signature.'),
      if (widget.existing == null) ...[
        const SizedBox(height: 12),
        RepaintBoundary(key: key, child: GestureDetector(
          onPanStart: (details) => setState(() => points.add(details.localPosition)),
          onPanUpdate: (details) => setState(() => points.add(details.localPosition)),
          onPanEnd: (_) => setState(() => points.add(null)),
          child: CustomPaint(painter: _SignaturePainter(points), child: Container(height: 170, decoration: BoxDecoration(border: Border.all(color: Colors.grey))))),
        ),
        TextButton(onPressed: () => setState(points.clear), child: const Text('Clear signature')),
      ],
      if (widget.requirePin) TextField(controller: pin, obscureText: true,
        keyboardType: TextInputType.number, maxLength: 6,
        decoration: const InputDecoration(labelText: 'Signing PIN')),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
    ]))),
    actions: [TextButton(onPressed: busy ? null : () => Navigator.pop(context), child: const Text('Cancel')),
      FilledButton(onPressed: busy ? null : submit, child: const Text('Confirm'))],
  );
}
void _drawSignature(Canvas canvas, List<Offset?> points) {
  final paint = Paint()..color = Colors.black..strokeWidth = 2.5..strokeCap = StrokeCap.round;
  for (var i = 1; i < points.length; i++) {
    if (points[i - 1] != null && points[i] != null) canvas.drawLine(points[i - 1]!, points[i]!, paint);
  }
}
class _SignaturePainter extends CustomPainter {
  const _SignaturePainter(this.points);
  final List<Offset?> points;
  @override void paint(Canvas canvas, Size size) => _drawSignature(canvas, points);
  @override bool shouldRepaint(_SignaturePainter oldDelegate) => true;
}
