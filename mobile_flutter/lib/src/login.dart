import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'auth.dart';
import 'legal.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key, required this.session, required this.onLogin});
  final AirmsSession session;
  final VoidCallback onLogin;
  @override State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final identifier = TextEditingController();
  final password = TextEditingController();
  String base = '';
  bool remember = false, busy = false, showPassword = false;
  String error = '';

  @override void initState() {
    super.initState();
    preferences().then((prefs) {
      if (mounted) {
        setState(() {
          base = prefs.getString('rememberedBase') ?? '';
          remember = prefs.getBool('rememberMe') ?? false;
          identifier.text = remember ? prefs.getString('rememberedIdentifier') ?? '' : '';
        });
      }
    });
  }
  @override void dispose() { identifier.dispose(); password.dispose(); super.dispose(); }

  Future<void> submit() async {
    if (identifier.text.trim().isEmpty || password.text.isEmpty || base.isEmpty) {
      setState(() => error = 'Enter your username or email, password, and base.'); return;
    }
    setState(() { busy = true; error = ''; });
    try {
      final location = await loginLocation();
      final data = await publicPost('/api/user/login', {
        'identifier': identifier.text.trim(), 'password': password.text,
        'client': 'mobile', 'rememberMe': remember, 'location': location,
        'base': base, 'trustedDeviceToken': await AirmsSession.storage.read(key: 'trustedDeviceToken') ?? '',
      }, headers: {
        'x-platform': 'MOBILE', 'x-base': base,
        'x-location-text': '${location['text']}',
        'x-location-latitude': '${(location['coordinates'] as Map)['latitude']}',
        'x-location-longitude': '${(location['coordinates'] as Map)['longitude']}',
        'x-device-platform': Platform.isIOS ? 'MOBILE_IOS' : 'MOBILE_ANDROID',
      });
      if (!mounted) return;
      if (data['requireLoginOtp'] == true) {
        final verification = data['verification'] as Map? ?? {};
        await Navigator.of(context).push(MaterialPageRoute(builder: (_) => OtpPage(
          session: widget.session, onLogin: widget.onLogin,
          token: '${verification['token']}', identifier: identifier.text.trim(),
          email: '${verification['maskedEmail'] ?? verification['email'] ?? ''}',
          base: base, location: location, remember: remember,
        )));
      } else if (data['requireSetup'] == true) {
        final account = data['user'] as Map? ?? {};
        await Navigator.of(context).push(MaterialPageRoute(builder: (_) => SecuritySetupPage(
          token: '${account['setupToken'] ?? ''}', email: '${account['email'] ?? ''}')));
      } else {
        final account = data['user'] as Map? ?? {};
        if (account['status'] == 'deactivated') {
          throw const ApiException('This account is deactivated. Please contact AirMS support.');
        }
        if (account['status'] == 'inactive' || account['setupToken'] != null) {
          await Navigator.of(context).push(MaterialPageRoute(builder: (_) => SecuritySetupPage(
            token: '${account['setupToken'] ?? ''}', email: '${account['email'] ?? ''}')));
          return;
        }
        await widget.session.acceptLogin(data, base: base, location: location);
        final prefs = await preferences();
        await prefs.setString('rememberedBase', base);
        await prefs.setBool('rememberMe', remember);
        if (remember) { await prefs.setString('rememberedIdentifier', identifier.text.trim()); }
        else { await prefs.remove('rememberedIdentifier'); }
        widget.onLogin();
      }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }

  @override Widget build(BuildContext context) => AuthLayout(title: 'Login', subtitle: 'Sign in to your AirMS account', children: [
    TextField(controller: identifier, decoration: const InputDecoration(labelText: 'Username or email', border: OutlineInputBorder())),
    const SizedBox(height: 16),
    TextField(controller: password, obscureText: !showPassword, decoration: InputDecoration(
      labelText: 'Password', border: const OutlineInputBorder(),
      suffixIcon: IconButton(icon: Icon(showPassword ? Icons.visibility_off : Icons.visibility),
        onPressed: () => setState(() => showPassword = !showPassword)))),
    const SizedBox(height: 16),
    DropdownButtonFormField<String>(key: ValueKey(base), initialValue: base.isEmpty ? null : base,
      decoration: const InputDecoration(labelText: 'Base', border: OutlineInputBorder()),
      items: const [DropdownMenuItem(value: 'MANILA', child: Text('Manila')),
        DropdownMenuItem(value: 'CEBU', child: Text('Cebu')),
        DropdownMenuItem(value: 'CDO', child: Text('Cagayan de Oro'))],
      onChanged: (value) => setState(() => base = value ?? '')),
    CheckboxListTile(value: remember, contentPadding: EdgeInsets.zero, title: const Text('Remember me'),
      onChanged: (value) => setState(() => remember = value ?? false)),
    if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
    const SizedBox(height: 12),
    FilledButton(onPressed: busy ? null : submit, child: busy ? const CircularProgressIndicator() : const Text('Login')),
    TextButton(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ForgotPasswordPage(
      initialEmail: identifier.text.contains('@') ? identifier.text.trim() : ''))),
      child: const Text('Forgot password?')),
    Wrap(alignment: WrapAlignment.center, crossAxisAlignment: WrapCrossAlignment.center, children: [
      TextButton(onPressed: () => showAirmsLegal(context, privacy: false), child: const Text('Terms and Conditions')),
      const Text('·'),
      TextButton(onPressed: () => showAirmsLegal(context, privacy: true), child: const Text('Privacy Policy')),
    ]),
  ]);
}

class AuthLayout extends StatelessWidget {
  const AuthLayout({super.key, required this.title, required this.subtitle, required this.children});
  final String title, subtitle;
  final List<Widget> children;
  @override Widget build(BuildContext context) {
    final height = MediaQuery.sizeOf(context).height;
    return Scaffold(body: Stack(children: [
      Positioned.fill(child: Image.asset('assets/mobile_hero.png', fit: BoxFit.cover)),
      Positioned.fill(child: Container(color: Colors.black.withValues(alpha: .26))),
      SafeArea(child: Align(alignment: Alignment.topCenter, child: Padding(
        padding: const EdgeInsets.only(top: 20), child: Column(mainAxisSize: MainAxisSize.min, children: [
          Image.asset('assets/airmslogo_dark.png', width: 190, height: 90),
          const Text('Aircraft Maintenance Made Smarter', style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold)),
        ])))),
      Align(alignment: Alignment.bottomCenter, child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: height * .78),
        child: Material(color: Colors.white, clipBehavior: Clip.antiAlias,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          child: SingleChildScrollView(padding: const EdgeInsets.fromLTRB(24, 18, 24, 36), child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Center(child: Container(width: 44, height: 5, decoration: BoxDecoration(color: const Color(0xffd7ddd9), borderRadius: BorderRadius.circular(5)))),
            const SizedBox(height: 20), Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 5), Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(color: Colors.black54)),
            const SizedBox(height: 25), ...children,
          ]))))),
    ]));
  }
}

class OtpPage extends StatefulWidget {
  const OtpPage({super.key, required this.session, required this.onLogin, required this.token,
    required this.identifier, required this.email, required this.base, required this.location, required this.remember});
  final AirmsSession session;
  final VoidCallback onLogin;
  final String token, identifier, email, base;
  final Map<String, dynamic> location;
  final bool remember;
  @override State<OtpPage> createState() => _OtpPageState();
}
class _OtpPageState extends State<OtpPage> {
  final code = TextEditingController();
  bool busy = false, trust = false;
  String error = '', info = '', verificationToken = '';
  int resendSeconds = 60;
  Timer? resendTimer;
  @override void initState() {
    super.initState();
    trust = widget.remember;
    verificationToken = widget.token;
    resendTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && resendSeconds > 0) { setState(() => resendSeconds--); }
    });
  }
  @override void dispose() { resendTimer?.cancel(); code.dispose(); super.dispose(); }
  Future<void> resend() async {
    if (busy || resendSeconds > 0) return;
    setState(() { busy = true; error = ''; info = ''; });
    try {
      final coordinates = widget.location['coordinates'] as Map? ?? {};
      final data = await publicPost('/api/user/login/resend-otp', {'token': verificationToken}, headers: {
        'x-platform': 'MOBILE', 'x-base': widget.base,
        'x-location-text': '${widget.location['text']}',
        'x-location-latitude': '${coordinates['latitude'] ?? ''}',
        'x-location-longitude': '${coordinates['longitude'] ?? ''}',
      });
      if (mounted) { setState(() {
        verificationToken = '${(data['verification'] as Map?)?['token'] ?? data['token'] ?? verificationToken}';
        resendSeconds = 60;
        code.clear();
        info = 'A new verification code was sent to your email.';
      }); }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> verify() async {
    if (code.text.length != 6) { setState(() => error = 'Enter the 6-digit code.'); return; }
    setState(() { busy = true; error = ''; });
    try {
      final data = await publicPost('/api/user/login/verify-otp', {
        'token': verificationToken, 'otp': code.text, 'rememberMe': widget.remember,
        'location': widget.location, 'base': widget.base, 'client': 'mobile',
        'trustDevice': widget.remember && trust, 'trustedDeviceLabel': 'mobile-app',
      }, headers: {'x-platform': 'MOBILE', 'x-base': widget.base,
        'x-location-text': '${widget.location['text']}',
        'x-location-latitude': '${(widget.location['coordinates'] as Map?)?['latitude'] ?? ''}',
        'x-location-longitude': '${(widget.location['coordinates'] as Map?)?['longitude'] ?? ''}'});
      if (data['trustedDeviceToken'] != null) {
        await AirmsSession.storage.write(
            key: 'trustedDeviceToken', value: '${data['trustedDeviceToken']}');
      }
      await widget.session.acceptLogin(data, base: widget.base, location: widget.location);
      final prefs = await preferences();
      await prefs.setString('rememberedBase', widget.base);
      await prefs.setBool('rememberMe', widget.remember);
      if (widget.remember) { await prefs.setString('rememberedIdentifier', widget.identifier); }
      else { await prefs.remove('rememberedIdentifier'); }
      if (mounted) { Navigator.pop(context); widget.onLogin(); }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) => AuthLayout(title: 'Verify OTP', subtitle: 'Enter the code sent to ${widget.email}', children: [
    TextField(controller: code, keyboardType: TextInputType.number, maxLength: 6,
      decoration: const InputDecoration(labelText: '6-digit code', border: OutlineInputBorder())),
    if (widget.remember) CheckboxListTile(value: trust, title: const Text('Trust this device'),
      onChanged: (value) => setState(() => trust = value ?? false)),
    if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
    if (info.isNotEmpty) Text(info, style: const TextStyle(color: Colors.green)),
    FilledButton(onPressed: busy ? null : verify, child: const Text('Verify')),
    TextButton(onPressed: busy || resendSeconds > 0 ? null : resend,
      child: Text(resendSeconds > 0 ? 'Resend code in ${resendSeconds}s' : 'Resend code')),
  ]);
}

class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({super.key, this.initialEmail = ''});
  final String initialEmail;
  @override State<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}
class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  final email = TextEditingController();
  bool busy = false;
  String error = '';
  @override void initState() { super.initState(); email.text = widget.initialEmail; }
  @override void dispose() { email.dispose(); super.dispose(); }
  Future<void> submit() async {
    setState(() { busy = true; error = ''; });
    try {
      final data = await publicPost('/api/user/request-password-reset', {'email': email.text.trim().toLowerCase()});
      if (mounted) Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => ResetOtpPage(token: '${data['token']}', email: email.text.trim())));
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) => AuthLayout(title: 'Forgot Password', subtitle: 'Please provide your email to proceed', children: [
    TextField(controller: email, keyboardType: TextInputType.emailAddress,
      decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder())),
    if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
    FilledButton(onPressed: busy ? null : submit, child: const Text('Continue')),
  ]);
}

class ResetOtpPage extends StatefulWidget {
  const ResetOtpPage({super.key, required this.token, required this.email});
  final String token, email;
  @override State<ResetOtpPage> createState() => _ResetOtpPageState();
}
class _ResetOtpPageState extends State<ResetOtpPage> {
  final code = TextEditingController(); String error = '', info = '', resetToken = ''; bool busy = false;
  int resendSeconds = 60;
  Timer? resendTimer;
  @override void initState() {
    super.initState();
    resetToken = widget.token;
    resendTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && resendSeconds > 0) { setState(() => resendSeconds--); }
    });
  }
  @override void dispose() { resendTimer?.cancel(); code.dispose(); super.dispose(); }
  Future<void> resend() async {
    if (busy || resendSeconds > 0) return;
    setState(() { busy = true; error = ''; info = ''; });
    try {
      final data = await publicPost('/api/user/request-password-reset', {'email': widget.email.trim().toLowerCase()});
      if (mounted) { setState(() {
        resetToken = '${data['token'] ?? resetToken}';
        resendSeconds = 60;
        code.clear();
        info = 'A new verification code was sent to your email.';
      }); }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> verify() async {
    if (!RegExp(r'^\d{6}$').hasMatch(code.text)) { setState(() => error = 'Enter the 6-digit code.'); return; }
    setState(() { busy = true; error = ''; });
    try {
      await publicPost('/api/user/verify-otp', {'token': resetToken, 'otp': code.text});
      if (mounted) Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => ResetPasswordPage(token: resetToken)));
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) => AuthLayout(title: 'Verify OTP', subtitle: widget.email, children: [
    TextField(controller: code, keyboardType: TextInputType.number, maxLength: 6,
      decoration: const InputDecoration(labelText: '6-digit code', border: OutlineInputBorder())),
    if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
    if (info.isNotEmpty) Text(info, style: const TextStyle(color: Colors.green)),
    FilledButton(onPressed: busy ? null : verify, child: const Text('Verify')),
    TextButton(onPressed: busy || resendSeconds > 0 ? null : resend,
      child: Text(resendSeconds > 0 ? 'Resend code in ${resendSeconds}s' : 'Resend code')),
  ]);
}

class ResetPasswordPage extends StatefulWidget {
  const ResetPasswordPage({super.key, required this.token});
  final String token;
  @override State<ResetPasswordPage> createState() => _ResetPasswordPageState();
}

class SecuritySetupPage extends StatefulWidget {
  const SecuritySetupPage({super.key, required this.token, required this.email});
  final String token, email;
  @override State<SecuritySetupPage> createState() => _SecuritySetupPageState();
}
class _SecuritySetupPageState extends State<SecuritySetupPage> {
  final password = TextEditingController(), confirmPassword = TextEditingController();
  final pin = TextEditingController(), confirmPin = TextEditingController();
  bool busy = false; String message = '';
  Future<void> submit() async {
    if (password.text.length < 8 || !RegExp('[A-Z]').hasMatch(password.text) || !RegExp(r'\d').hasMatch(password.text)) {
      setState(() => message = 'Password needs 8 characters, an uppercase letter, and a number.'); return;
    }
    if (password.text != confirmPassword.text || !RegExp(r'^\d{6}$').hasMatch(pin.text) || pin.text != confirmPin.text) {
      setState(() => message = 'Check that passwords and 6-digit PINs match.'); return;
    }
    setState(() { busy = true; message = ''; });
    try {
      await publicPost('/api/user/activate', {'token': widget.token, 'newPassword': password.text, 'pin': pin.text});
      if (mounted) Navigator.pop(context);
    } catch (e) { if (mounted) setState(() => message = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> resend() async {
    try {
      final data = await publicPost('/api/user/resend-activation', {'email': widget.email});
      if (mounted) setState(() => message = '${data['message'] ?? 'Activation link sent.'}');
    } catch (e) { if (mounted) setState(() => message = '$e'); }
  }
  @override Widget build(BuildContext context) => AuthLayout(title: 'Security Setup', subtitle: 'Set your new password and PIN to proceed', children: [
    TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'New password', border: OutlineInputBorder())),
    const SizedBox(height: 12),
    TextField(controller: confirmPassword, obscureText: true, decoration: const InputDecoration(labelText: 'Confirm password', border: OutlineInputBorder())),
    const SizedBox(height: 12),
    TextField(controller: pin, obscureText: true, keyboardType: TextInputType.number, maxLength: 6,
      decoration: const InputDecoration(labelText: '6-digit PIN', border: OutlineInputBorder())),
    const SizedBox(height: 12),
    TextField(controller: confirmPin, obscureText: true, keyboardType: TextInputType.number, maxLength: 6,
      decoration: const InputDecoration(labelText: 'Confirm PIN', border: OutlineInputBorder())),
    if (message.isNotEmpty) Text(message, style: const TextStyle(color: Colors.red)),
    FilledButton(onPressed: busy ? null : submit, child: const Text('Activate account')),
    TextButton(onPressed: busy ? null : resend, child: const Text('Resend activation link')),
  ]);
}
class _ResetPasswordPageState extends State<ResetPasswordPage> {
  final password = TextEditingController(), confirm = TextEditingController();
  String error = ''; bool busy = false;
  Future<void> submit() async {
    if (password.text != confirm.text || password.text.length < 8 ||
        !RegExp('[A-Z]').hasMatch(password.text) || !RegExp(r'\d').hasMatch(password.text)) {
      setState(() => error = 'Use 8 characters with an uppercase letter and a number; passwords must match.'); return;
    }
    setState(() { busy = true; error = ''; });
    try {
      await publicPost('/api/user/reset-password', {'token': widget.token, 'newPassword': password.text});
      if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) => AuthLayout(title: 'Reset Password', subtitle: 'Set a new password', children: [
    TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'New password', border: OutlineInputBorder())),
    const SizedBox(height: 16),
    TextField(controller: confirm, obscureText: true, decoration: const InputDecoration(labelText: 'Confirm password', border: OutlineInputBorder())),
    if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
    FilledButton(onPressed: busy ? null : submit, child: const Text('Reset password')),
  ]);
}
