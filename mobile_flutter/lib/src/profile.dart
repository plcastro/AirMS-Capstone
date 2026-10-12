import 'package:flutter/material.dart';
import 'toast.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'auth.dart';
import 'display_settings.dart';
import 'legal.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key, required this.session});
  final AirmsSession session;
  @override State<ProfilePage> createState() => _ProfilePageState();
}
class _ProfilePageState extends State<ProfilePage> {
  String tab = 'Information', error = '';
  bool busy = false, notifications = true, aircraftAlerts = false;
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
    if (!value) {
      setState(() => notifications = false);
      await saveSettings();
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
      final picked = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 70, maxWidth: 800);
      if (picked == null) return;
      if (!mounted) return;
      final confirmed = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
        title: const Text('Save Profile Image'), content: const Text('Use this photo as your profile image?'),
        actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Save'))]));
      if (confirmed != true) return;
      setState(() => busy = true);
      final request = http.MultipartRequest('PUT', Uri.parse('$apiBase/api/user/update-user-image/$userId'));
      request.headers.addAll({...widget.session.headers()..remove('Content-Type'), 'x-action-confirmed': 'true'});
      request.files.add(await http.MultipartFile.fromPath('image', picked.path,
        filename: picked.name, contentType: MediaType('image', picked.name.toLowerCase().endsWith('.png') ? 'png' : 'jpeg')));
      final response = await http.Response.fromStream(await request.send());
      final data = decodeResponse(response);
      if (response.statusCode >= 400) throw ApiException('${data['message'] ?? 'Image upload failed'}');
      if (data['user'] is Map) await widget.session.updateUser(Map<String, dynamic>.from(data['user']));
      if (mounted) setState(() => error = '');
    } catch (e) { if (mounted) { setState(() => error = '$e'); } }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> removeImage() async {
    setState(() => busy = true);
    try {
      await widget.session.request('/api/user/update-user-image/$userId', method: 'PUT',
        extraHeaders: {'x-action-confirmed': 'true'}, body: {'image': null, 'confirmAction': true});
      await widget.session.updateUser({'image': null});
      if (mounted) setState(() => error = '');
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) {
    final user = widget.session.user ?? {};
    return ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 100), children: [
      Card(child: Padding(padding: const EdgeInsets.all(20), child: Column(children: [
        InkWell(onTap: busy ? null : pickImage, child: CircleAvatar(radius: 60,
          backgroundColor: const Color(0xffe6f4f1),
          backgroundImage: imageUrl == null ? null : NetworkImage(imageUrl!),
          child: imageUrl == null ? Text('${user['firstName'] ?? 'U'}'[0], style: const TextStyle(fontSize: 36)) : null)),
        const SizedBox(height: 10),
        Text('${user['firstName'] ?? ''} ${user['lastName'] ?? ''}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        Text('${user['jobTitle'] ?? ''}'),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [TextButton(onPressed: busy ? null : pickImage, child: const Text('Change photo')),
          if (imageUrl != null) TextButton(onPressed: busy ? null : removeImage, child: const Text('Remove'))]),
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
      if (tab == 'Information') for (final entry in [
        ('First Name', user['firstName']), ('Last Name', user['lastName']),
        ('Email', user['email']), ('Username', user['username']),
        ('Job Title', user['jobTitle']), ('Access', user['access']),
        ('License No.', user['licenseNo']), ('Base', user['base']),
        ('Last Login', user['lastLogin']),
      ]) Card(child: ListTile(title: Text(entry.$1), subtitle: Text('${entry.$2 ?? 'N/A'}'))),
      if (tab == 'Information') const Padding(padding: EdgeInsets.all(8), child: Text(
        'Name editing is disabled. Contact an administrator to update your legal profile name.')),
      if (tab == 'Security') SecurityPage(session: widget.session),
      if (tab == 'Settings') ...[
        SwitchListTile(title: const Text('Notifications'), value: notifications,
          onChanged: setNotifications),
        if (canManageAircraftAlerts) SwitchListTile(title: const Text('Aircraft flight hour alerts'), value: aircraftAlerts,
          onChanged: (value) { setState(() => aircraftAlerts = value); saveSettings(); }),
        if (canManageAircraftAlerts) Text('Alert threshold: ${aircraftThreshold.round()} hours'),
        if (canManageAircraftAlerts) Slider(value: aircraftThreshold, min: 1, max: 100, divisions: 99,
          onChanged: (value) => setState(() => aircraftThreshold = value), onChangeEnd: (_) => saveSettings()),
        Text('Font size: ${(fontScale * 100).round()}%'),
        Slider(value: fontScale, min: 1, max: 1.3, divisions: 6,
          onChanged: (value) { setState(() => fontScale = value); airmsFontScale.value = value; }, onChangeEnd: (_) => saveSettings()),
        ListTile(title: const Text('Terms and Conditions'), trailing: const Icon(Icons.chevron_right),
          onTap: () => showAirmsLegal(context, privacy: false)),
        ListTile(title: const Text('Privacy Policy'), trailing: const Icon(Icons.chevron_right),
          onTap: () => showAirmsLegal(context, privacy: true)),
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
  }
  String get userId => '${widget.session.user?['id'] ?? widget.session.user?['_id'] ?? ''}';
  Future<void> call(String path, String method, Map<String, dynamic> body, String success,
      {bool confirmed = false}) async {
    setState(() { busy = true; error = ''; info = ''; });
    try {
      await widget.session.request(path, method: method, body: {...body, if (confirmed) 'confirmAction': true},
        extraHeaders: confirmed ? {'x-action-confirmed': 'true', 'x-confirm-action': 'true'} : {});
      if (mounted) setState(() { clearInputs(); info = success; });
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> changePassword() async {
    if (newPassword.text.length < 8 || !RegExp('[A-Z]').hasMatch(newPassword.text) ||
        !RegExp(r'\d').hasMatch(newPassword.text) || newPassword.text != confirmPassword.text || currentPassword.text.isEmpty) {
      setState(() => error = 'Use 8 characters, an uppercase letter and a number. Confirm the new password.'); return;
    }
    await call('/api/user/change-password/$userId', 'PUT',
      {'currentPassword': currentPassword.text, 'newPassword': newPassword.text}, 'Password updated', confirmed: true);
  }
  Future<void> changePin() async {
    if (!RegExp(r'^\d{6}$').hasMatch(currentPin.text) || !RegExp(r'^\d{6}$').hasMatch(newPin.text) || newPin.text != confirmPin.text) {
      setState(() => error = 'Current and new PINs must be 6 digits, and the new PINs must match.'); return;
    }
    await call('/api/user/update-pin/$userId', 'PUT',
      {'currentPin': currentPin.text, 'newPin': newPin.text}, 'PIN updated', confirmed: true);
  }
  Future<void> requestPinOtp() async {
    if (passwordForPin.text.isEmpty) {
      setState(() => error = 'Enter your current password.');
      return;
    }
    setState(() { busy = true; error = ''; });
    try {
      final data = await widget.session.request('/api/user/request-pin-reset/$userId', method: 'POST',
        body: {'currentPassword': passwordForPin.text});
      if (mounted) setState(() { resetToken = '${data['token'] ?? ''}'; otp.clear(); otpSent = true; otpVerified = false; info = 'OTP sent to your email.'; });
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> verifyPinOtp() async {
    if (!RegExp(r'^\d{6}$').hasMatch(otp.text)) {
      setState(() => error = 'Enter the complete 6-digit OTP.');
      return;
    }
    setState(() { busy = true; error = ''; });
    try {
      await widget.session.request('/api/user/verify-pin-otp', method: 'POST', body: {'otp': otp.text, 'token': resetToken});
      if (mounted) setState(() { otpVerified = true; info = 'OTP verified.'; });
    } catch (e) {
      if (mounted) { setState(() {
        error = '$e';
        if ('$e'.toLowerCase().contains('expired')) {
          otpSent = false;
          otpVerified = false;
          resetToken = '';
          otp.clear();
          error = 'OTP expired. Please request a new one.';
        }
      }); }
    }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> resetPin() async {
    if (!RegExp(r'^\d{6}$').hasMatch(newPin.text) || newPin.text != confirmPin.text) {
      setState(() => error = 'New PINs must be matching 6-digit numbers.'); return;
    }
    await call('/api/user/reset-pin', 'POST', {'token': resetToken, 'newPin': newPin.text}, 'PIN reset', confirmed: true);
  }
  @override Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
    const Text('Update Security', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
    const Text('Manage your account password and six-digit security PIN.'),
    const SizedBox(height: 12),
    SegmentedButton<String>(segments: const [ButtonSegment(value: 'Password', label: Text('Password')),
      ButtonSegment(value: 'PIN', label: Text('PIN'))], selected: {tab},
      onSelectionChanged: (value) => setState(() => tab = value.first)),
    const SizedBox(height: 12),
    if (tab == 'Password') ...[
      TextField(controller: currentPassword, obscureText: true, decoration: const InputDecoration(labelText: 'Current password')),
      TextField(controller: newPassword, obscureText: true, decoration: const InputDecoration(labelText: 'New password')),
      TextField(controller: confirmPassword, obscureText: true, decoration: const InputDecoration(labelText: 'Confirm password')),
      const SizedBox(height: 12), FilledButton(onPressed: busy ? null : changePassword, child: const Text('Update Password')),
    ] else ...[
      if (!forgotPin) TextField(controller: currentPin, obscureText: true, keyboardType: TextInputType.number,
        maxLength: 6, decoration: const InputDecoration(labelText: 'Current PIN')),
      if (forgotPin && !otpSent) TextField(controller: passwordForPin, obscureText: true,
        decoration: const InputDecoration(labelText: 'Current password')),
      if (forgotPin && otpSent && !otpVerified) TextField(controller: otp,
        keyboardType: TextInputType.number, maxLength: 6, decoration: const InputDecoration(labelText: 'Email OTP')),
      if (!forgotPin || otpVerified) ...[
        TextField(controller: newPin, obscureText: true, keyboardType: TextInputType.number, maxLength: 6,
          decoration: const InputDecoration(labelText: 'New PIN')),
        TextField(controller: confirmPin, obscureText: true, keyboardType: TextInputType.number, maxLength: 6,
          decoration: const InputDecoration(labelText: 'Confirm PIN')),
      ],
      if (forgotPin) ...[
        if (!otpSent) FilledButton(onPressed: busy ? null : requestPinOtp, child: const Text('Send OTP')),
        if (otpSent && !otpVerified) FilledButton(onPressed: busy ? null : verifyPinOtp, child: const Text('Verify OTP')),
        if (otpVerified) FilledButton(onPressed: busy ? null : resetPin, child: const Text('Reset PIN')),
      ] else FilledButton(onPressed: busy ? null : changePin, child: const Text('Update PIN')),
      TextButton(onPressed: busy ? null : () => setState(() {
        forgotPin = !forgotPin;
        otpSent = false;
        otpVerified = false;
        resetToken = '';
        error = '';
        info = '';
        otp.clear();
      }), child: Text(forgotPin ? 'Use current PIN' : 'Forgot PIN?')),
    ],
    if (busy) const LinearProgressIndicator(),
    if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
    if (info.isNotEmpty) Text(info, style: const TextStyle(color: Colors.green)),
  ]);
}
