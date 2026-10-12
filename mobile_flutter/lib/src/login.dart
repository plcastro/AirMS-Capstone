import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'auth.dart';
import 'legal.dart';
import 'auth_validation.dart';
import 'toast.dart';

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
    final validation = loginValidationMessage(identifier.text, password.text, base);
    if (validation != null) { setState(() => error = validation); AirmsToast.show(validation); return; }
    setState(() { busy = true; error = ''; });
    try {
      final location = await loginLocation();
      if ('${location['text'] ?? ''}'.trim().isEmpty) {
        const message = 'Allow location access so AirMS can record where you are logging in from.';
        if (mounted) setState(() => error = message);
        AirmsToast.show(message);
        return;
      }
      final data = await publicPost('/api/user/login', {
        'identifier': identifier.text.trim(), 'password': password.text.trim(),
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
    } on ApiException catch (e) { if (mounted) { setState(() => error = '$e'); AirmsToast.show(e); } }
      catch (_) { if (mounted) { setState(() => error = 'Login error. Please try again.'); AirmsToast.show(error); } }
    finally { if (mounted) setState(() => busy = false); }
  }

  @override Widget build(BuildContext context) => busy
    ? const AuthLoadingScreen(message: 'Signing you in...')
    : AuthLayout(title: 'Login', subtitle: 'Sign in to access your AirMS account', children: [
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
    Row(children: [Expanded(child: CheckboxListTile(value: remember, contentPadding: EdgeInsets.zero,
      title: const Text('Stay signed in'), onChanged: (value) => setState(() => remember = value ?? false))),
      TextButton(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ForgotPasswordPage(
        initialEmail: identifier.text.contains('@') ? identifier.text.trim() : ''))),
        child: const Text('Forgot Password?'))]),
    if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
    const SizedBox(height: 12),
    FilledButton(onPressed: submit, child: const Text('LOGIN')),
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

class AuthLoadingScreen extends StatelessWidget {
  const AuthLoadingScreen({super.key, this.message = 'Loading...'});
  final String message;
  @override Widget build(BuildContext context) => AuthLayout(
    title: 'Please wait', subtitle: message, children: const [
      SizedBox(height: 24), Center(child: CircularProgressIndicator()),
      SizedBox(height: 12), Center(child: Text('We are preparing your session.')),
    ]);
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
    final validation = forgotEmailValidation(email.text);
    if (validation != null) { setState(() => error = validation); AirmsToast.show(validation); return; }
    setState(() { busy = true; error = ''; });
    try {
      final normalizedEmail = email.text.trim().toLowerCase();
      final data = await publicPost('/api/user/request-password-reset', {'email': normalizedEmail});
      AirmsToast.show('Password reset email sent. Redirecting to OTP screen...');
      await Future<void>.delayed(const Duration(milliseconds: 2500));
      if (mounted) Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => ResetOtpPage(token: '${data['token']}', email: normalizedEmail)));
    } on ApiException catch (e) {
      final message = '$e' == 'User not found.' ? 'The email you entered does not correspond to any account.' : '$e';
      if (mounted) { setState(() => error = message); AirmsToast.show(message); }
    } catch (_) {
      const message = 'Failed to send reset link. Please try again later.';
      if (mounted) { setState(() => error = message); AirmsToast.show(message); }
    }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) => AuthLayout(title: 'Forgot Password', subtitle: 'Please provide your email to proceed', children: [
    TextField(controller: email, keyboardType: TextInputType.emailAddress, onChanged: (_) => setState(() => error = ''),
      decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder())),
    if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
    FilledButton(onPressed: busy ? null : submit, child: Text(busy ? 'SENDING...' : 'CONTINUE')),
    TextButton(onPressed: busy ? null : () => Navigator.of(context).popUntil((route) => route.isFirst),
      child: const Text('Remember your password? Log in')),
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
  bool busy = false, resendBusy = false, showPassword = false, showPin = false;
  String message = '';
  Future<void> submit() async {
    final validation = securitySetupValidation(password.text, confirmPassword.text, pin.text, confirmPin.text);
    if (validation != null) { setState(() => message = validation); AirmsToast.show(validation); return; }
    setState(() { busy = true; message = ''; });
    try {
      await publicPost('/api/user/activate', {'token': widget.token, 'newPassword': password.text, 'pin': pin.text});
      const success = 'Password and PIN set successfully! Redirecting to login...';
      if (mounted) setState(() => message = success);
      AirmsToast.show(success);
      await Future<void>.delayed(const Duration(milliseconds: 2500));
      if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
    } catch (e) { if (mounted) { setState(() => message = '$e'); AirmsToast.show(e); } }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> resend() async {
    if (resendBusy) return;
    setState(() => resendBusy = true);
    try {
      final data = await publicPost('/api/user/resend-activation', {'email': widget.email});
      if (mounted) setState(() => message = '${data['message'] ?? 'Activation link sent.'}');
    } catch (e) { if (mounted) setState(() => message = '$e'); }
    finally { if (mounted) setState(() => resendBusy = false); }
  }
  @override Widget build(BuildContext context) => AuthLayout(title: 'Security Setup', subtitle: 'Set your new password and PIN to proceed', children: [
    TextField(controller: password, obscureText: !showPassword, onChanged: (_) => setState(() {}),
      decoration: InputDecoration(labelText: 'New password', border: const OutlineInputBorder(),
        suffixIcon: IconButton(onPressed: () => setState(() => showPassword = !showPassword),
          icon: Icon(showPassword ? Icons.visibility_off : Icons.visibility)))),
    const SizedBox(height: 12),
    TextField(controller: confirmPassword, obscureText: !showPassword,
      decoration: const InputDecoration(labelText: 'Confirm password', border: OutlineInputBorder())),
    const SizedBox(height: 8),
    const Text('Password Requirements:'),
    Text('${password.text.length >= 8 ? '[OK]' : '[ ]'} At least 8 characters'),
    Text('${RegExp('[A-Z]').hasMatch(password.text) ? '[OK]' : '[ ]'} One uppercase letter'),
    Text('${RegExp(r'\d').hasMatch(password.text) ? '[OK]' : '[ ]'} One number'),
    const SizedBox(height: 12),
    TextField(controller: pin, obscureText: !showPin, keyboardType: TextInputType.number, maxLength: 6,
      decoration: InputDecoration(labelText: '6-digit PIN', border: const OutlineInputBorder(),
        suffixIcon: IconButton(onPressed: () => setState(() => showPin = !showPin),
          icon: Icon(showPin ? Icons.visibility_off : Icons.visibility)))),
    const SizedBox(height: 12),
    TextField(controller: confirmPin, obscureText: !showPin, keyboardType: TextInputType.number, maxLength: 6,
      decoration: const InputDecoration(labelText: 'Confirm PIN', border: OutlineInputBorder())),
    if (message.isNotEmpty) Text(message, style: const TextStyle(color: Colors.red)),
    FilledButton(onPressed: busy ? null : submit, child: const Text('Activate account')),
    TextButton(onPressed: busy || resendBusy ? null : resend,
      child: Text(resendBusy ? 'SENDING...' : 'Resend activation link')),
  ]);
}
class _ResetPasswordPageState extends State<ResetPasswordPage> {
  final password = TextEditingController(), confirm = TextEditingController();
  String error = '', success = ''; bool busy = false, showPassword = false;
  Future<void> submit() async {
    if (widget.token.isEmpty) { setState(() => error = 'Invalid or missing reset token.'); return; }
    final validation = resetPasswordValidation(password.text, confirm.text);
    if (validation != null) { setState(() => error = validation); AirmsToast.show(validation); return; }
    setState(() { busy = true; error = ''; });
    try {
      await publicPost('/api/user/reset-password', {'token': widget.token, 'newPassword': password.text});
      const message = 'Password reset successfully. Taking you to login...';
      if (mounted) setState(() => success = message);
      AirmsToast.show(message);
      await Future<void>.delayed(const Duration(milliseconds: 1600));
      if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
    } catch (e) { if (mounted) { setState(() => error = '$e'); AirmsToast.show(e); } }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) => widget.token.isEmpty
    ? AuthLayout(title: 'Invalid Reset Link', subtitle: 'This password reset link is invalid or has expired.', children: [
        const Icon(Icons.link_off, color: Colors.red, size: 38),
        const Text('Request a new password reset link to continue. For your account security, old or incomplete links cannot be used.'),
        FilledButton(onPressed: () => Navigator.pushReplacement(context,
          MaterialPageRoute(builder: (_) => const ForgotPasswordPage())), child: const Text('REQUEST NEW LINK')),
        OutlinedButton(onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
          child: const Text('BACK TO LOGIN')),
      ])
    : AuthLayout(title: 'Reset Password', subtitle: 'Enter your new password', children: [
    TextField(controller: password, obscureText: !showPassword, onChanged: (_) => setState(() {}),
      decoration: InputDecoration(labelText: 'New password', border: const OutlineInputBorder(),
        suffixIcon: IconButton(onPressed: () => setState(() => showPassword = !showPassword),
          icon: Icon(showPassword ? Icons.visibility_off : Icons.visibility)))),
    const SizedBox(height: 16),
    TextField(controller: confirm, obscureText: !showPassword, onChanged: (_) => setState(() {}),
      decoration: const InputDecoration(labelText: 'Confirm password', border: OutlineInputBorder())),
    if (password.text.isNotEmpty && confirm.text.isNotEmpty && password.text == confirm.text)
      const Text('Passwords match.', style: TextStyle(color: Color(0xff26866f))),
    const Text('Password Requirements:'),
    Text('${password.text.length >= 8 ? '[OK]' : '[ ]'} At least 8 characters'),
    Text('${RegExp('[A-Z]').hasMatch(password.text) ? '[OK]' : '[ ]'} One uppercase letter'),
    Text('${RegExp(r'\d').hasMatch(password.text) ? '[OK]' : '[ ]'} One number'),
    if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
    if (success.isNotEmpty) Text(success, style: const TextStyle(color: Color(0xff26866f))),
    FilledButton(onPressed: busy ? null : submit, child: Text(busy ? 'RESETTING...' : 'RESET PASSWORD')),
  ]);
}
