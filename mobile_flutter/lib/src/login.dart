import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'auth.dart';
import 'legal.dart';
import 'auth_validation.dart';
import 'toast.dart';

Widget requirementText(bool met, String label) => Text(
  '${met ? '[OK]' : '[ ]'} $label',
  style: TextStyle(fontSize: 12, color: met ? const Color(0xff26866f) : const Color(0xff999999)),
);

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
  Map<String, dynamic>? detectedLocation;
  bool detectingLocation = true;

  @override void initState() {
    super.initState();
    detectLocation();
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

  Future<Map<String, dynamic>?> detectLocation() async {
    if (mounted) setState(() => detectingLocation = true);
    try {
      final value = await loginLocation();
      if (mounted) setState(() => detectedLocation = value);
      return value;
    } catch (_) {
      if (mounted) setState(() => detectedLocation = null);
      return null;
    } finally {
      if (mounted) setState(() => detectingLocation = false);
    }
  }

  Future<void> submit() async {
    final validation = loginValidationMessage(identifier.text, password.text, base);
    if (validation != null) { setState(() => error = validation); AirmsToast.show(validation); return; }
    final location = detectedLocation ?? await detectLocation() ?? <String, dynamic>{};
    if (!mounted) return;
    if ('${location['text'] ?? ''}'.trim().isEmpty) {
      setState(() => error = 'Allow location access so AirMS can record where you are logging in from.');
      return;
    }
    setState(() { busy = true; error = ''; });
    try {
      final data = await publicPost('/api/user/login', {
        'identifier': identifier.text.trim(), 'password': password.text.trim(),
        'client': 'mobile', 'rememberMe': remember, 'location': location,
        'base': base, 'trustedDeviceToken': await AirmsSession.storage.read(key: 'trustedDeviceToken') ?? '',
      }, headers: {
        'x-platform': 'MOBILE', 'x-base': base,
        ...loginLocationHeaders(location),
        'x-device-platform': kIsWeb ? 'WEB' : Platform.isIOS ? 'MOBILE_IOS' : 'MOBILE_ANDROID',
      });
      if (!mounted) return;
      final prefs = await preferences();
      await prefs.setString('rememberedBase', base);
      if (!mounted) return;
      if (data['requireSetup'] == true) {
        final account = data['user'] as Map? ?? {};
        await Navigator.of(context).push(MaterialPageRoute(builder: (_) => SecuritySetupPage(
          token: '${account['setupToken'] ?? ''}', email: '${account['email'] ?? ''}')));
      } else if (data['requireLoginOtp'] == true && (data['verification'] as Map?)?['token'] != null) {
        final verification = data['verification'] as Map? ?? {};
        await Navigator.of(context).push(MaterialPageRoute(builder: (_) => OtpPage(
          session: widget.session, onLogin: widget.onLogin,
          token: '${verification['token']}', identifier: identifier.text.trim(),
          email: '${verification['maskedEmail'] ?? verification['email'] ?? ''}',
          base: base, location: location, remember: remember,
        )));
      } else {
        final account = data['user'] as Map? ?? {};
        if (account.isEmpty || data['token'] == null) {
          throw ApiException('${data['message'] ?? 'Invalid login response'}');
        }
        if (account['status'] == 'deactivated') {
          throw const ApiException('This account is deactivated. Please contact AirMS support.');
        }
        if (account['status'] == 'inactive' || account['setupToken'] != null) {
          await Navigator.of(context).push(MaterialPageRoute(builder: (_) => SecuritySetupPage(
            token: '${account['setupToken'] ?? ''}', email: '${account['email'] ?? ''}')));
          return;
        }
        await widget.session.acceptLogin(data, base: base, location: location);
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
    TextField(controller: identifier, maxLength: 256, autocorrect: false, decoration: const InputDecoration(labelText: 'Username or Email', hintText: 'Enter your username or email', counterText: '', border: OutlineInputBorder())),
    const SizedBox(height: 16),
    TextField(controller: password, maxLength: 256, obscureText: !showPassword, decoration: InputDecoration(
      labelText: 'Password', hintText: 'Enter your password', counterText: '', border: const OutlineInputBorder(),
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
    FilledButton(onPressed: detectingLocation ? null : submit, child: const Text('LOGIN')),
    const SizedBox(height: 16),
    const Text('By signing in, you agree to the', textAlign: TextAlign.center,
      style: TextStyle(color: Colors.grey)),
    Wrap(alignment: WrapAlignment.center, crossAxisAlignment: WrapCrossAlignment.center, children: [
      TextButton(onPressed: () => showAirmsLegal(context, privacy: false), child: const Text('Terms and Conditions')),
      const Text('and', style: TextStyle(color: Colors.grey)),
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

class SixDigitCodeField extends StatefulWidget {
  const SixDigitCodeField({super.key, required this.controller, this.secure = false});
  final TextEditingController controller;
  final bool secure;
  @override State<SixDigitCodeField> createState() => _SixDigitCodeFieldState();
}
class _SixDigitCodeFieldState extends State<SixDigitCodeField> {
  final focus = FocusNode();
  @override void initState() { super.initState(); widget.controller.addListener(changed); }
  @override void dispose() { widget.controller.removeListener(changed); focus.dispose(); super.dispose(); }
  void changed() { if (mounted) setState(() {}); }
  @override Widget build(BuildContext context) {
    final code = widget.controller.text;
    return GestureDetector(onTap: () => focus.requestFocus(), child: Stack(children: [
      Opacity(opacity: 0, child: TextField(controller: widget.controller, focusNode: focus,
        keyboardType: TextInputType.number, maxLength: 6,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        autofillHints: const [AutofillHints.oneTimeCode],
        onChanged: (value) {
          final digits = value.replaceAll(RegExp(r'\D'), '');
          if (digits != value) {
            widget.controller.value = TextEditingValue(text: digits,
              selection: TextSelection.collapsed(offset: digits.length));
          }
        })),
      IgnorePointer(child: Row(children: List.generate(6, (index) => Expanded(
        child: Container(height: 48, margin: const EdgeInsets.symmetric(horizontal: 3),
          alignment: Alignment.center,
          decoration: BoxDecoration(border: Border.all(color: index == code.length
            ? const Color(0xff26866f) : Colors.grey), borderRadius: BorderRadius.circular(6)),
          child: Text(index < code.length ? (widget.secure ? 'â€¢' : code[index]) : '',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold))),
      )))),
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
    code.addListener(updateCode);
    resendTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && resendSeconds > 0) { setState(() => resendSeconds--); }
    });
  }
  void updateCode() { if (mounted) setState(() {}); }
  @override void dispose() { resendTimer?.cancel(); code.removeListener(updateCode); code.dispose(); super.dispose(); }
  Future<void> resend() async {
    if (busy || resendSeconds > 0) return;
    setState(() { busy = true; error = ''; info = ''; });
    try {
      final data = await publicPost('/api/user/login/resend-otp', {'token': verificationToken}, headers: {
        'x-platform': 'MOBILE', ...loginLocationHeaders(widget.location),
        'x-device-platform': kIsWeb ? 'WEB' : Platform.isIOS ? 'MOBILE_IOS' : 'MOBILE_ANDROID',
      });
      if (mounted) { setState(() {
        verificationToken = '${(data['verification'] as Map?)?['token'] ?? data['token'] ?? verificationToken}';
        resendSeconds = 60;
        info = '';
      }); }
      AirmsToast.show('OTP resent to your email.');
    } on ApiException catch (e) { if (mounted) setState(() => error = '$e'); }
      catch (_) { if (mounted) { setState(() => error = 'Failed to send OTP. Please try again later.'); AirmsToast.show('Failed to resend OTP.'); } }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> verify() async {
    if (code.text.length != 6) { setState(() => error = 'Enter the 6-digit code.'); return; }
    if (verificationToken.isEmpty) { setState(() => error = 'Missing verification token.'); return; }
    setState(() { busy = true; error = ''; });
    try {
      final data = await publicPost('/api/user/login/verify-otp', {
        'token': verificationToken, 'otp': code.text, 'rememberMe': widget.remember,
        'location': widget.location, 'base': widget.base, 'client': 'mobile',
        'trustDevice': widget.remember && trust, 'trustedDeviceLabel': 'mobile-app',
      }, headers: {'x-platform': 'MOBILE', 'x-base': widget.base,
        ...loginLocationHeaders(widget.location),
        'x-device-platform': kIsWeb ? 'WEB' : Platform.isIOS ? 'MOBILE_IOS' : 'MOBILE_ANDROID'});
      if (data['trustedDeviceToken'] != null) {
        await AirmsSession.storage.write(
            key: 'trustedDeviceToken', value: '${data['trustedDeviceToken']}');
        for (final account in [widget.identifier, data['user']?['email'], data['user']?['username']]) {
          final normalized = '${account ?? ''}'.trim().toLowerCase();
          if (normalized.isNotEmpty) {
            await AirmsSession.storage.delete(key: 'trustedDeviceToken:$normalized');
          }
        }
      }
      await widget.session.acceptLogin(data, base: widget.base, location: widget.location);
      final prefs = await preferences();
      await prefs.setString('rememberedBase', widget.base);
      await prefs.setBool('rememberMe', widget.remember);
      if (widget.remember) { await prefs.setString('rememberedIdentifier', widget.identifier); }
      else { await prefs.remove('rememberedIdentifier'); }
      if (mounted) setState(() => info = 'OTP verified. Redirecting...');
      AirmsToast.show('Login verified');
      await Future<void>.delayed(const Duration(milliseconds: 1200));
      if (mounted) { Navigator.of(context).popUntil((route) => route.isFirst); widget.onLogin(); }
    } on ApiException catch (e) {
      if ('$e'.toLowerCase().contains('expired')) {
        verificationToken = '';
        if (mounted) setState(() => error = 'OTP expired. Please log in again.');
        await Future<void>.delayed(const Duration(milliseconds: 1500));
        if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
      } else if (mounted) { setState(() => error = '$e'); }
    } catch (_) { if (mounted) setState(() => error = 'Failed to verify OTP. Please try again later.'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) => AuthLayout(title: info.startsWith('OTP verified')
    ? 'Login Verified' : 'Login Verification', subtitle: 'Please enter the 6-digit code sent to ${widget.email}', children: [
    SixDigitCodeField(controller: code),
    FilledButton(onPressed: busy || code.text.length != 6 ? null : verify,
      child: busy ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Verify')),
    CheckboxListTile(value: trust, title: const Text('Remember this device for 30 days'),
      enabled: widget.remember,
      controlAffinity: ListTileControlAffinity.trailing,
      onChanged: (value) => setState(() => trust = value ?? false)),
    const SizedBox(height: 10),
    if (error.isNotEmpty && code.text.length == 6) Text(error, style: const TextStyle(color: Colors.red)),
    if (info.isNotEmpty && code.text.length == 6) Text(info, style: const TextStyle(color: Color(0xff26866f))),
    OutlinedButton(onPressed: busy || resendSeconds > 0 ? null : resend,
      child: Text(resendSeconds > 0 ? 'Resend code (${resendSeconds}s)' : 'Resend code')),
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
    TextField(controller: email, keyboardType: TextInputType.emailAddress, maxLength: 254,
      textCapitalization: TextCapitalization.none, onChanged: (_) => setState(() => error = ''),
      decoration: const InputDecoration(labelText: 'Email *', hintText: 'Enter email address', counterText: '', border: OutlineInputBorder())),
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
    code.addListener(updateCode);
    resendTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && resendSeconds > 0) { setState(() => resendSeconds--); }
    });
  }
  void updateCode() { if (mounted) setState(() {}); }
  @override void dispose() { resendTimer?.cancel(); code.removeListener(updateCode); code.dispose(); super.dispose(); }
  Future<void> resend() async {
    if (busy || resendSeconds > 0) return;
    setState(() { busy = true; error = ''; info = ''; });
    try {
      final data = await publicPost('/api/user/request-password-reset', {'email': widget.email.trim().toLowerCase()});
      if (mounted) { setState(() {
        resetToken = '${data['token'] ?? resetToken}';
        resendSeconds = 60;
        info = '';
      }); }
      AirmsToast.show('OTP resent to your email.');
    } on ApiException catch (e) { if (mounted) setState(() => error = '$e'); }
      catch (_) { if (mounted) { setState(() => error = 'Failed to send OTP. Please try again later.'); AirmsToast.show('Failed to resend OTP.'); } }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> verify() async {
    if (!RegExp(r'^\d{6}$').hasMatch(code.text)) { setState(() => error = 'Enter the 6-digit code.'); return; }
    if (resetToken.isEmpty) { setState(() => error = 'Missing verification token.'); return; }
    setState(() { busy = true; error = ''; });
    try {
      await publicPost('/api/user/verify-otp', {'token': resetToken, 'otp': code.text});
      if (mounted) setState(() => info = 'OTP verified. Redirecting...');
      AirmsToast.show('OTP verified. Redirecting...');
      await Future<void>.delayed(const Duration(milliseconds: 1200));
      await AirmsSession.storage.write(key: 'pendingPasswordResetToken', value: resetToken);
      if (mounted) Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => ResetPasswordPage(token: resetToken)));
    } on ApiException catch (e) {
      final message = '$e'.toLowerCase().contains('expired') ? 'OTP expired! Please request a new one.' : '$e';
      if (mounted) setState(() => error = message);
    } catch (_) { if (mounted) setState(() => error = 'Failed to verify OTP. Please try again later.'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) => AuthLayout(title: 'Account Verification',
    subtitle: 'Please enter the 6-digit code sent to ${widget.email}', children: [
    SixDigitCodeField(controller: code),
    FilledButton(onPressed: busy || code.text.length != 6 ? null : verify,
      child: busy ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Verify')),
    if (error.isNotEmpty && code.text.length == 6) Text(error, style: const TextStyle(color: Colors.red)),
    if (info.isNotEmpty && code.text.length == 6) Text(info, style: const TextStyle(color: Color(0xff26866f))),
    OutlinedButton(onPressed: busy || resendSeconds > 0 ? null : resend,
      child: Text(resendSeconds > 0 ? 'Resend code (${resendSeconds}s)' : 'Resend code')),
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
  bool busy = false, resendBusy = false, showPassword = false, showPin = false, setupSuccess = false;
  String message = '', resendMessage = '';
  @override void initState() { super.initState(); pin.addListener(updatePin); confirmPin.addListener(updatePin); }
  void updatePin() { if (mounted) setState(() { message = ''; }); }
  @override void dispose() { pin.removeListener(updatePin); confirmPin.removeListener(updatePin); password.dispose(); confirmPassword.dispose(); pin.dispose(); confirmPin.dispose(); super.dispose(); }
  Future<void> submit() async {
    final validation = securitySetupValidation(password.text, confirmPassword.text, pin.text, confirmPin.text);
    if (validation != null) { setState(() => message = validation); AirmsToast.show(validation); return; }
    setState(() { busy = true; message = ''; });
    try {
      await publicPost('/api/user/activate', {'token': widget.token, 'newPassword': password.text, 'pin': pin.text});
      const success = 'Password and PIN set successfully! Redirecting to login...';
      if (mounted) setState(() { message = success; setupSuccess = true; });
      AirmsToast.show(success);
      await Future<void>.delayed(const Duration(milliseconds: 2500));
      if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
    } catch (e) { if (mounted) { setState(() => message = '$e'); AirmsToast.show(e); } }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> resend() async {
    if (resendBusy) return;
    if (widget.email.isEmpty) return;
    setState(() { resendBusy = true; resendMessage = ''; });
    try {
      final data = await publicPost('/api/user/resend-activation', {'email': widget.email});
      if (mounted) setState(() => resendMessage = '${data['message'] ?? 'Activation link sent!'}');
    } catch (e) { if (mounted) setState(() => resendMessage = '$e'); }
    finally { if (mounted) setState(() => resendBusy = false); }
  }
  @override Widget build(BuildContext context) => AuthLayout(title: 'Security Setup', subtitle: 'Set your new password and PIN to proceed', children: [
    TextField(controller: password, obscureText: !showPassword, onChanged: (_) => setState(() { message = ''; }),
      decoration: InputDecoration(labelText: 'New Password *', hintText: 'Enter new password', border: const OutlineInputBorder(),
        suffixIcon: IconButton(onPressed: () => setState(() => showPassword = !showPassword),
          icon: Icon(showPassword ? Icons.visibility_off : Icons.visibility)))),
    const SizedBox(height: 12),
    TextField(controller: confirmPassword, obscureText: !showPassword, onChanged: (_) => setState(() { message = ''; }),
      decoration: InputDecoration(labelText: 'Confirm Password *', hintText: 'Confirm new password', border: const OutlineInputBorder(),
        suffixIcon: IconButton(onPressed: () => setState(() => showPassword = !showPassword),
          icon: Icon(showPassword ? Icons.visibility_off : Icons.visibility)))),
    const SizedBox(height: 8),
    const Text('Password Requirements:', style: TextStyle(fontSize: 12, color: Color(0xff666666))),
    requirementText(password.text.length >= 8, 'At least 8 characters'),
    requirementText(RegExp('[A-Z]').hasMatch(password.text), 'One uppercase letter'),
    requirementText(RegExp(r'\d').hasMatch(password.text), 'One number'),
    const SizedBox(height: 12),
    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      const Text('Set 6-digit PIN *'),
      TextButton.icon(onPressed: () => setState(() => showPin = !showPin),
        icon: Icon(showPin ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18),
        label: Text(showPin ? 'Hide PIN' : 'Show PIN')),
    ]),
    SixDigitCodeField(controller: pin, secure: !showPin),
    const SizedBox(height: 12),
    const Text('Confirm PIN *'),
    SixDigitCodeField(controller: confirmPin, secure: !showPin),
    if (message.isNotEmpty && !setupSuccess) Text(message, style: const TextStyle(color: Colors.red)),
    FilledButton(onPressed: busy || setupSuccess || securitySetupValidation(password.text, confirmPassword.text, pin.text, confirmPin.text) != null ? null : submit,
      child: const Text('SET PASSWORD & PIN')),
    OutlinedButton(onPressed: resendBusy ? null : resend,
      child: Text(resendBusy ? 'SENDING...' : 'RESEND ACTIVATION LINK')),
    if (resendMessage.isNotEmpty) Text(resendMessage, style: const TextStyle(color: Colors.grey, fontSize: 12)),
  ]);
}
class _ResetPasswordPageState extends State<ResetPasswordPage> {
  final password = TextEditingController(), confirm = TextEditingController();
  String error = '', success = '', resetToken = '';
  bool busy = false, redirecting = false, tokenLoading = false;
  @override void initState() {
    super.initState();
    resetToken = widget.token;
    if (resetToken.isEmpty) {
      tokenLoading = true;
      loadResetToken();
    }
  }
  Future<void> loadResetToken() async {
    try {
      final value = await AirmsSession.storage.read(key: 'pendingPasswordResetToken');
      if (mounted) setState(() => resetToken = value ?? '');
    } catch (_) {
      // The invalid-link state handles unavailable secure storage.
    } finally {
      if (mounted) setState(() => tokenLoading = false);
    }
  }
  @override void dispose() { password.dispose(); confirm.dispose(); super.dispose(); }
  Future<void> submit() async {
    if (resetToken.isEmpty) { setState(() => error = 'Invalid or missing reset token.'); return; }
    final validation = resetPasswordValidation(password.text, confirm.text);
    if (validation != null) { setState(() => error = validation); AirmsToast.show(validation); return; }
    setState(() { busy = true; error = ''; });
    try {
      await publicPost('/api/user/reset-password', {'token': resetToken, 'newPassword': password.text});
      await AirmsSession.storage.delete(key: 'pendingPasswordResetToken');
      const message = 'Password reset successfully. Taking you to login...';
      if (mounted) setState(() { success = message; redirecting = true; });
      AirmsToast.show(message);
      await Future<void>.delayed(const Duration(milliseconds: 1600));
      if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
    } catch (e) { if (mounted) { setState(() => error = '$e'); AirmsToast.show(e); } }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) => tokenLoading
    ? const AuthLayout(title: 'Reset Password', subtitle: 'Preparing reset', children: [Center(child: CircularProgressIndicator())])
    : resetToken.isEmpty
    ? AuthLayout(title: 'Invalid Reset Link', subtitle: 'This password reset link is invalid or has expired.', children: [
        Center(child: Container(width: 74, height: 74, decoration: BoxDecoration(color: const Color(0xfffff2f0),
          border: Border.all(color: const Color(0xffffccc7)), borderRadius: BorderRadius.circular(37)),
          child: const Icon(Icons.link_off, color: Color(0xffcf1322), size: 38))),
        const SizedBox(height: 16),
        const Text('Request a new password reset link to continue. For your account security, old or incomplete links cannot be used.', textAlign: TextAlign.center),
        FilledButton(onPressed: () => Navigator.pushReplacement(context,
          MaterialPageRoute(builder: (_) => const ForgotPasswordPage())), child: const Text('REQUEST NEW LINK')),
        OutlinedButton(onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
          child: const Text('BACK TO LOGIN')),
      ])
    : AuthLayout(title: 'Reset Password', subtitle: 'Enter your new password', children: [
    TextField(controller: password, obscureText: true, onChanged: (_) => setState(() { error = ''; success = ''; }),
      decoration: const InputDecoration(labelText: 'New Password *', hintText: 'New Password', border: OutlineInputBorder())),
    const SizedBox(height: 16),
    TextField(controller: confirm, obscureText: true, onChanged: (_) => setState(() { error = ''; success = ''; }),
      decoration: const InputDecoration(labelText: 'Confirm Password *', hintText: 'Confirm Password', border: OutlineInputBorder())),
    if (password.text.isNotEmpty && confirm.text.isNotEmpty && password.text == confirm.text)
      const Text('Passwords match.', style: TextStyle(color: Color(0xff26866f))),
    const SizedBox(height: 10),
    const Text('Password Requirements:', style: TextStyle(fontSize: 12, color: Color(0xff666666))),
    requirementText(password.text.length >= 8, 'At least 8 characters'),
    requirementText(RegExp('[A-Z]').hasMatch(password.text), 'One uppercase letter'),
    requirementText(RegExp(r'\d').hasMatch(password.text), 'One number'),
    if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
    if (success.isNotEmpty) Row(mainAxisAlignment: MainAxisAlignment.center, children: [
      if (redirecting) const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
      Flexible(child: Text(success, style: const TextStyle(color: Colors.green))),
    ]),
    FilledButton(onPressed: busy || redirecting ? null : submit,
      child: Text(redirecting ? 'REDIRECTING...' : busy ? 'RESETTING...' : 'RESET PASSWORD')),
    TextButton(onPressed: redirecting ? null : () => Navigator.of(context).popUntil((route) => route.isFirst),
      child: const Text('Remember your password? Sign In')),
  ]);
}
