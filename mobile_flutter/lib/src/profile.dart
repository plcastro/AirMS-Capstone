import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'toast.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image/image.dart' as img;
import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'auth.dart';
import 'display_settings.dart';
import 'legal.dart';
import 'date_time.dart';
import 'push.dart';

String profileInitials(String first, String last) {
  final value = '${first.isEmpty ? '' : first[0]}${last.isEmpty ? '' : last[0]}'.toUpperCase().trim();
  return value.isEmpty ? 'U' : value;
}

/// The RN picker edits to a square and limits the longer edge to 800 pixels.
List<int>? prepareProfilePhoto(List<int> bytes) {
  final source = img.decodeImage(Uint8List.fromList(bytes));
  if (source == null) return null;
  final edge = source.width < source.height ? source.width : source.height;
  final square = img.copyCrop(source, x: (source.width - edge) ~/ 2,
    y: (source.height - edge) ~/ 2, width: edge, height: edge);
  final output = edge > 800 ? img.copyResize(square, width: 800, height: 800) : square;
  return img.encodeJpg(output, quality: 70);
}

String? passwordValidation(String next, String confirmation, String current) {
  if (next.length < 8) return 'Use at least 8 characters';
  if (!RegExp('[A-Z]').hasMatch(next)) return 'Include at least one uppercase letter.';
  if (!RegExp(r'\d').hasMatch(next)) return 'Include at least one number.';
  if (next != confirmation) return 'Passwords must match';
  if (current.isEmpty) return 'Enter your current password.';
  return null;
}

(String, Color) passwordStrength(String value) {
  if (value.isEmpty) return ('', Colors.transparent);
  final count = [value.length >= 8, RegExp('[A-Z]').hasMatch(value),
    RegExp(r'\d').hasMatch(value), RegExp('[a-z]').hasMatch(value)].where((valid) => valid).length;
  if (count <= 2) return ('Weak Password', const Color(0xffff4d4f));
  if (count == 3) return ('Moderate Password', const Color(0xfffaad14));
  return ('Strong Password', const Color(0xff00c88c));
}

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key, required this.session});
  final AirmsSession session;
  @override State<ProfilePage> createState() => _ProfilePageState();
}
class _ProfilePageState extends State<ProfilePage> {
  String tab = 'Information', error = '';
  bool busy = false, notifications = true, aircraftAlerts = false;
  Uint8List? previewBytes;
  double fontScale = 1, aircraftThreshold = 25;
  bool get canManageAircraftAlerts => ['maintenance manager', 'admin staff', 'officer-in-charge']
    .contains('${widget.session.user?['jobTitle'] ?? widget.session.user?['access'] ?? ''}'.trim().toLowerCase());
  @override void initState() { super.initState(); loadSettings(); }
  Future<void> loadSettings() async {
    final prefs = await preferences();
    if (mounted) {
      setState(() {
        notifications = prefs.getBool('notificationsEnabled') ?? true;
        aircraftAlerts = prefs.getBool('aircraftFhDueNotificationsEnabled') ?? false;
        fontScale = (prefs.getDouble('fontSizePreference') ?? 1).clamp(1, 1.3);
        aircraftThreshold = prefs.getDouble('aircraftFhDueThreshold') ?? 25;
      });
    }
  }
  Future<void> saveSettings() async {
    final prefs = await preferences();
    await prefs.setBool('notificationsEnabled', notifications);
    await prefs.setBool('aircraftFhDueNotificationsEnabled', aircraftAlerts);
    await prefs.setDouble('fontSizePreference', fontScale);
    airmsFontScale.value = fontScale;
    await prefs.setDouble('aircraftFhDueThreshold', aircraftThreshold);
  }
  Future<void> setNotifications(bool value) async {
    if (kIsWeb) return;
    if (!value) {
      setState(() => notifications = false);
      await saveSettings();
      pushPreferenceChanged.value = false;
      if (Firebase.apps.isNotEmpty) { try { await FirebaseMessaging.instance.deleteToken(); } catch (_) {} }
      if (mounted) AirmsToast.show('Notifications turned off in app settings.');
      return;
    }
    try {
      if (Firebase.apps.isEmpty) throw const ApiException('Push notifications are not configured on this device.');
      final permission = await FirebaseMessaging.instance.requestPermission();
      final allowed = permission.authorizationStatus == AuthorizationStatus.authorized ||
        permission.authorizationStatus == AuthorizationStatus.provisional;
      if (mounted) setState(() => notifications = allowed);
      await saveSettings();
      pushPreferenceChanged.value = allowed;
      if (allowed) {
        final token = await FirebaseMessaging.instance.getToken();
        if (token != null) await PushService(widget.session, (_) {}, (_) {}).register(token);
      }
      if (mounted) {
        AirmsToast.show(allowed
          ? 'Notifications are enabled.' : 'Notification permission was denied. Enable it in device settings.');
      }
    } catch (e) {
      if (mounted) AirmsToast.show(e);
    }
  }
  String get userId => '${widget.session.user?['id'] ?? widget.session.user?['_id'] ?? ''}';
  String? get imageUrl {
    final image = '${widget.session.user?['image'] ?? ''}';
    if (image.isEmpty) return null;
    return image.startsWith('http') ? image : '$apiBase/${image.replaceFirst(RegExp(r'^/+'), '')}';
  }
  Future<void> pickImage() async {
    try {
      final picked = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 70);
      if (picked == null) return;
      final prepared = prepareProfilePhoto(await picked.readAsBytes());
      if (prepared == null) throw const ApiException('Could not prepare the profile photo.');
      if (!mounted) return;
      setState(() => previewBytes = Uint8List.fromList(prepared));
      final confirmed = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
        title: const Text('Save Profile Image'), content: const Text('Use this photo as your profile image?'),
        actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Save'))]));
      if (confirmed != true) { if (mounted) setState(() => previewBytes = null); return; }
      setState(() => busy = true);
      final request = http.MultipartRequest('PUT', Uri.parse('$apiBase/api/user/update-user-image/$userId'));
      request.headers.addAll({...widget.session.headers()..remove('Content-Type'), 'x-action-confirmed': 'true'});
      request.files.add(http.MultipartFile.fromBytes('image', prepared,
        filename: 'profile_$userId.jpg', contentType: MediaType('image', 'jpeg')));
      final response = await http.Response.fromStream(await request.send());
      final data = decodeResponse(response);
      if (response.statusCode >= 400) throw ApiException('${data['message'] ?? 'Image upload failed'}');
      if (data['user'] is Map) await widget.session.updateUser(Map<String, dynamic>.from(data['user']));
      if (mounted) setState(() { error = ''; previewBytes = null; });
      if (mounted) AirmsToast.show('Image updated!');
    } on PlatformException catch (e) {
      if (mounted) {
        await showDialog<void>(context: context, builder: (dialogContext) => AlertDialog(
          title: const Text('Photo permission denied'),
          content: Text(e.message ?? 'Allow photo access in your device settings.'),
          actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('OK'))],
        ));
      }
    } catch (e) { if (mounted) { setState(() => previewBytes = null); AirmsToast.show(e); } }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> removeImage() async {
    final confirmed = await showDialog<bool>(context: context, builder: (dialogContext) => AlertDialog(
      title: const Text('Delete Image'), content: const Text('Are you sure you want to delete your profile image?'),
      actions: [TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('No')),
        FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Yes'))],
    ));
    if (confirmed != true || !mounted) return;
    setState(() => busy = true);
    try {
      await widget.session.request('/api/user/update-user-image/$userId', method: 'PUT',
        extraHeaders: {'x-action-confirmed': 'true'}, body: {'image': null, 'confirmAction': true});
      await widget.session.updateUser({'image': null});
      if (mounted) setState(() => error = '');
      if (mounted) AirmsToast.show('Profile picture removed!');
    } catch (e) { if (mounted) AirmsToast.show(e); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) {
    final user = widget.session.user ?? {};
    return ListView(padding: const EdgeInsets.fromLTRB(14, 14, 14, 110), children: [
      Card(color: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), child: Padding(padding: const EdgeInsets.fromLTRB(16, 18, 16, 8), child: Column(children: [
        InkWell(onTap: busy ? null : pickImage, child: CircleAvatar(radius: 60,
          backgroundColor: const Color(0xffdddddd),
          backgroundImage: previewBytes != null ? MemoryImage(previewBytes!) : imageUrl == null ? null : NetworkImage(imageUrl!),
          child: imageUrl == null && previewBytes == null ? Text(profileInitials('${user['firstName'] ?? ''}', '${user['lastName'] ?? ''}'), style: const TextStyle(fontSize: 36)) : null)),
        const SizedBox(height: 12),
        Text('${user['firstName'] ?? ''} ${user['lastName'] ?? ''}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        Text('${user['jobTitle'] ?? ''}'),
        const SizedBox(height: 6), const Text('Tap photo to update profile image'),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [IconButton(tooltip: 'Edit profile image', onPressed: busy ? null : pickImage, icon: const Icon(Icons.edit_outlined)),
          IconButton(tooltip: 'Remove profile image', onPressed: busy || imageUrl == null ? null : removeImage, icon: const Icon(Icons.delete_outline, color: Color(0xffc74848)))]),
      ]))),
      if (busy) const LinearProgressIndicator(),
      if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
      const SizedBox(height: 12),
      SingleChildScrollView(scrollDirection: Axis.horizontal, child: SegmentedButton<String>(
        segments: const [ButtonSegment(value: 'Information', label: Text('Information')),
          ButtonSegment(value: 'Security', label: Text('Security')),
          ButtonSegment(value: 'Settings', label: Text('Settings'))],
        selected: {tab}, onSelectionChanged: (value) => setState(() => tab = value.first))),
      const SizedBox(height: 14),
      if (tab == 'Information') const Padding(padding: EdgeInsets.all(8), child: Text('Account Information', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
      if (tab == 'Information') for (final entry in [
        ('First Name', user['firstName']), ('Last Name', user['lastName']),
        ('Username', user['username']), ('Email Address', user['email']),
        ('Last Login', formatAirmsDateTime(user['lastLogin'], fallback: 'Never')),
      ]) Padding(padding: const EdgeInsets.only(bottom: 16), child: TextFormField(
        initialValue: '${entry.$2 ?? ''}', readOnly: true, decoration: InputDecoration(labelText: entry.$1, border: const OutlineInputBorder()))),
      if (tab == 'Information') const Padding(padding: EdgeInsets.all(8), child: Text(
        'Name editing is disabled. Contact an administrator to update your legal profile name.')),
      if (tab == 'Security') SecurityPage(session: widget.session),
      if (tab == 'Settings') ...[
        const Text('App Settings', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12), const Text('Font Size', style: TextStyle(fontWeight: FontWeight.w600)),
        const Text('Range: Recommended (1.00x) to Max (1.30x)'),
        Slider(value: fontScale, min: 1, max: 1.3, divisions: 6,
          onChanged: (value) { setState(() => fontScale = value); airmsFontScale.value = value; },
          onChangeEnd: (_) { saveSettings(); AirmsToast.show('Font size preference saved.'); }),
        Text('Current: ${fontScale.toStringAsFixed(2)}x'),
        if (!kIsWeb) SwitchListTile(title: const Text('Enable Notifications'), subtitle: const Text('Managed by device settings.'), value: notifications,
          onChanged: setNotifications),
        if (!kIsWeb && canManageAircraftAlerts) SwitchListTile(title: const Text('Aircraft FH Due Alerts'), subtitle: const Text('Notify when an aircraft inspection is near its flight hour limit.'), value: aircraftAlerts,
          onChanged: (value) { setState(() => aircraftAlerts = value); saveSettings(); AirmsToast.show(value ? 'Aircraft FH due alerts enabled.' : 'Aircraft FH due alerts disabled.'); }),
        if (!kIsWeb && canManageAircraftAlerts) Row(children: [const Text('Notify within'), const SizedBox(width: 8),
          SizedBox(width: 70, child: TextFormField(key: ValueKey('threshold-${aircraftThreshold.round()}'),
            initialValue: '${aircraftThreshold.round()}', enabled: aircraftAlerts,
            keyboardType: TextInputType.number, decoration: const InputDecoration(border: OutlineInputBorder()),
            onChanged: (value) { final digits = value.replaceAll(RegExp(r'\D'), '');
              aircraftThreshold = (int.tryParse(digits.substring(0, digits.length.clamp(0, 3))) ?? 1).clamp(1, 999).toDouble(); saveSettings(); },
          )), const SizedBox(width: 8), const Text('FH')]),
        ListTile(title: const Text('Terms and Conditions'), subtitle: const Text('Review system access, records, privacy, and acceptable use documents.'),
          trailing: Wrap(children: [IconButton(tooltip: 'View terms and conditions', onPressed: () => showAirmsLegal(context, privacy: false), icon: const Icon(Icons.description_outlined)),
            IconButton(tooltip: 'View privacy policy', onPressed: () => showAirmsLegal(context, privacy: true), icon: const Icon(Icons.shield_outlined))])),
      ],
    ]);
  }
}

class SecurityPage extends StatefulWidget {
  const SecurityPage({super.key, required this.session});
  final AirmsSession session;
  @override State<SecurityPage> createState() => _SecurityPageState();
}
class _SecurityPageState extends State<SecurityPage> {
  String tab = 'Password', error = '', info = '', resetToken = '';
  bool busy = false, forgotPin = false, otpSent = false, otpVerified = false;
  bool showPin = false;
  final visiblePasswords = <String, bool>{};
  final currentPassword = TextEditingController(), newPassword = TextEditingController();
  final confirmPassword = TextEditingController(), currentPin = TextEditingController();
  final newPin = TextEditingController(), confirmPin = TextEditingController();
  final passwordForPin = TextEditingController(), otp = TextEditingController();
  @override void dispose() {
    for (final controller in [currentPassword, newPassword, confirmPassword,
      currentPin, newPin, confirmPin, passwordForPin, otp]) {
      controller.dispose();
    }
    super.dispose();
  }
  void clearInputs() {
    for (final controller in [currentPassword, newPassword, confirmPassword,
      currentPin, newPin, confirmPin, passwordForPin, otp]) {
      controller.clear();
    }
    resetToken = '';
    forgotPin = false;
    otpSent = false;
    otpVerified = false;
    showPin = false;
    visiblePasswords.clear();
  }
  String get userId => '${widget.session.user?['id'] ?? widget.session.user?['_id'] ?? ''}';
  Future<void> call(String path, String method, Map<String, dynamic> body, String success,
      {bool confirmed = false}) async {
    setState(() { busy = true; error = ''; info = ''; });
    try {
      await widget.session.request(path, method: method, body: {...body, if (confirmed) 'confirmAction': true},
        extraHeaders: confirmed ? {'x-action-confirmed': 'true', 'x-confirm-action': 'true'} : {});
      if (mounted) { setState(() { clearInputs(); info = success; }); AirmsToast.show(success); }
    } catch (e) { if (mounted) AirmsToast.show(e); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> changePassword() async {
    final validation = passwordValidation(newPassword.text, confirmPassword.text, currentPassword.text);
    if (validation != null) { AirmsToast.show('Password requirements not met: $validation'); return; }
    await call('/api/user/change-password/$userId', 'PUT',
      {'currentPassword': currentPassword.text, 'newPassword': newPassword.text}, 'Password updated', confirmed: true);
  }
  Future<void> changePin() async {
    if (!RegExp(r'^\d{6}$').hasMatch(currentPin.text) || !RegExp(r'^\d{6}$').hasMatch(newPin.text) || newPin.text != confirmPin.text) {
      AirmsToast.show('Current PIN must be 6 digits, and New PIN and Confirm PIN must match.'); return;
    }
    await call('/api/user/update-pin/$userId', 'PUT',
      {'currentPin': currentPin.text, 'newPin': newPin.text}, 'PIN updated', confirmed: true);
  }
  Future<void> requestPinOtp() async {
    if (passwordForPin.text.isEmpty) {
      AirmsToast.show('Enter your current password.');
      return;
    }
    setState(() { busy = true; error = ''; });
    try {
      final data = await widget.session.request('/api/user/request-pin-reset/$userId', method: 'POST',
        body: {'currentPassword': passwordForPin.text});
      if (mounted) { setState(() { resetToken = '${data['token'] ?? ''}'; otp.clear(); otpSent = true; otpVerified = false; }); AirmsToast.show('OTP sent to your email.'); }
    } catch (e) { if (mounted) AirmsToast.show(e); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> verifyPinOtp() async {
    if (!RegExp(r'^\d{6}$').hasMatch(otp.text)) {
      AirmsToast.show('Please enter the complete 6-digit OTP.');
      return;
    }
    setState(() { busy = true; error = ''; });
    try {
      await widget.session.request('/api/user/verify-pin-otp', method: 'POST', body: {'otp': otp.text, 'token': resetToken});
      if (mounted) { setState(() => otpVerified = true); AirmsToast.show('OTP verified! You can now reset your PIN.'); }
    } catch (e) {
      if (mounted) { setState(() {
        if ('$e'.toLowerCase().contains('expired')) {
          otpSent = false;
          otpVerified = false;
          resetToken = '';
          otp.clear();
          AirmsToast.show('OTP expired! Please request a new one.');
        } else {
          AirmsToast.show(e);
        }
      }); }
    }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> resetPin() async {
    if (!RegExp(r'^\d{6}$').hasMatch(newPin.text) || newPin.text != confirmPin.text) {
      AirmsToast.show('New PIN and Confirm PIN must match and be exactly 6 digits.'); return;
    }
    await call('/api/user/reset-pin', 'POST', {'token': resetToken, 'newPin': newPin.text}, 'PIN reset', confirmed: true);
  }
  Widget secretField(String label, TextEditingController controller, String key) => TextField(
    controller: controller, obscureText: !(visiblePasswords[key] ?? false),
    decoration: InputDecoration(labelText: '$label *', border: const OutlineInputBorder(),
      suffixIcon: IconButton(tooltip: visiblePasswords[key] == true ? 'Hide password' : 'Show password',
        icon: Icon(visiblePasswords[key] == true ? Icons.visibility_off : Icons.visibility),
        onPressed: () => setState(() => visiblePasswords[key] = !(visiblePasswords[key] ?? false)))),
  );
  Widget codeField(String label, TextEditingController controller, {bool secure = true}) => Padding(
    padding: const EdgeInsets.only(bottom: 14), child: Container(
      padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: const Color(0xfffafbfc),
        border: Border.all(color: const Color(0xffdddddd)), borderRadius: BorderRadius.circular(10)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('$label *', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8), TextField(controller: controller, obscureText: secure,
          keyboardType: TextInputType.number, inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
          maxLength: 6, decoration: const InputDecoration(counterText: '', border: OutlineInputBorder())),
      ])));
  @override Widget build(BuildContext context) => Container(color: Colors.white, padding: const EdgeInsets.fromLTRB(14, 14, 14, 18),
    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
    const Text('Update Security', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
    const SizedBox(height: 4), const Text('Manage your account password and six-digit security PIN.', style: TextStyle(fontSize: 12)),
    const SizedBox(height: 12),
    SegmentedButton<String>(segments: const [ButtonSegment(value: 'Password', label: Text('Password')),
      ButtonSegment(value: 'PIN', label: Text('PIN'))], selected: {tab},
      onSelectionChanged: (value) => setState(() { tab = value.first; clearInputs(); })),
    const SizedBox(height: 12),
    if (tab == 'Password') ...[
      secretField('Current Password', currentPassword, 'current'), const SizedBox(height: 12),
      secretField('New Password', newPassword, 'new'),
      ValueListenableBuilder<TextEditingValue>(valueListenable: newPassword, builder: (context, value, child) {
        final strength = passwordStrength(value.text);
        return strength.$1.isEmpty ? const SizedBox.shrink() : Padding(padding: const EdgeInsets.only(bottom: 10),
          child: Text(strength.$1, style: TextStyle(fontSize: 12, color: strength.$2)));
      }),
      secretField('Confirm Password', confirmPassword, 'confirm'),
      const SizedBox(height: 12), FilledButton(onPressed: busy ? null : changePassword, child: const Text('Save Password')),
    ] else ...[
      if (!forgotPin) codeField('Current PIN', currentPin, secure: !showPin),
      if (forgotPin && !otpSent) ...[const Text('Reset PIN', style: TextStyle(fontWeight: FontWeight.bold)),
        secretField('Current Password', passwordForPin, 'pinReset')],
      if (forgotPin && otpSent && !otpVerified) ...[const Text('Verify OTP', style: TextStyle(fontWeight: FontWeight.bold)),
        codeField('OTP', otp, secure: false)],
      if (!forgotPin || otpVerified) ...[
        if (otpVerified) const Text('Create New PIN', style: TextStyle(fontWeight: FontWeight.bold)),
        codeField('New PIN', newPin, secure: !showPin),
        codeField(otpVerified ? 'Confirm New PIN' : 'Confirm PIN', confirmPin, secure: !showPin),
        TextButton.icon(onPressed: () => setState(() => showPin = !showPin),
          icon: Icon(showPin ? Icons.visibility_off : Icons.visibility), label: Text(showPin ? 'Hide PIN' : 'Show PIN')),
      ],
      if (forgotPin) ...[
        if (!otpSent) FilledButton(onPressed: busy ? null : requestPinOtp, child: const Text('Send OTP')),
        if (otpSent && !otpVerified) ...[FilledButton(onPressed: busy ? null : verifyPinOtp, child: const Text('Verify OTP')),
          OutlinedButton(onPressed: busy ? null : () => setState(() => otpSent = false), child: const Text('Back'))],
        if (otpVerified) FilledButton(onPressed: busy ? null : resetPin, child: const Text('Reset PIN')),
        OutlinedButton(onPressed: busy ? null : () => setState(clearInputs), child: const Text('Cancel')),
      ] else ...[TextButton(onPressed: busy ? null : () => setState(() => forgotPin = true), child: const Text('Forgot PIN?')),
        FilledButton(onPressed: busy ? null : changePin, child: const Text('Save PIN'))],
    ],
    if (busy) const LinearProgressIndicator(),
    if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
    if (info.isNotEmpty) Text(info, style: const TextStyle(color: Colors.green)),
  ]));
}
