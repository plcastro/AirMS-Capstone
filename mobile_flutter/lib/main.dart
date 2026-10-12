import 'dart:async';
import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'src/auth.dart';
import 'src/login.dart';
import 'src/shell.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'src/push.dart';
import 'src/display_settings.dart';
import 'src/toast.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await loadAirmsDeviceModel();
  try {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(airmsBackgroundMessage);
  } catch (_) {}
  runApp(const AirmsApp());
}

class AirmsApp extends StatefulWidget {
  const AirmsApp({super.key});
  @override
  State<AirmsApp> createState() => _AirmsAppState();
}

class _AirmsAppState extends State<AirmsApp> {
  final session = AirmsSession();
  final navigatorKey = GlobalKey<NavigatorState>();
  StreamSubscription<Uri>? linkSubscription;
  Uri? pendingLink;
  String? handledAuthLink;
  bool ready = false;
  @override
  void initState() {
    super.initState();
    preferences().then((prefs) {
      airmsFontScale.value = (prefs.getDouble('fontSizePreference') ?? 1).clamp(1, 1.3);
    });
    linkSubscription = AppLinks().uriLinkStream.listen(receiveLink);
    session.restore().whenComplete(() {
      if (mounted) setState(() => ready = true);
      WidgetsBinding.instance.addPostFrameCallback((_) => openAuthLink());
    });
  }
  @override void dispose() { linkSubscription?.cancel(); session.dispose(); super.dispose(); }
  void receiveLink(Uri link) {
    if (!['airms', 'https', 'http'].contains(link.scheme)) return;
    if (link.scheme != 'airms' && !['airms.online', 'www.airms.online', 'api.airms.online', 'airms-server.vercel.app'].contains(link.host)) return;
    setState(() => pendingLink = link);
    WidgetsBinding.instance.addPostFrameCallback((_) => openAuthLink());
  }
  void openAuthLink() {
    final link = pendingLink;
    if (!ready || link == null || session.user != null || navigatorKey.currentState == null) return;
    final segment = link.pathSegments.isEmpty ? link.host : link.pathSegments.last;
    if (!['reset-password', 'security-setup', 'forgot-password'].contains(segment)) return;
    if (handledAuthLink == link.toString()) return;
    handledAuthLink = link.toString();
    final token = link.queryParameters['token'] ?? '';
    if (segment == 'reset-password' && token.isNotEmpty) {
      navigatorKey.currentState!.push(MaterialPageRoute(builder: (_) => ResetPasswordPage(token: token)));
    } else if (segment == 'security-setup' && token.isNotEmpty) {
      navigatorKey.currentState!.push(MaterialPageRoute(builder: (_) => SecuritySetupPage(
        token: token, email: link.queryParameters['email'] ?? '')));
    } else if (segment == 'forgot-password') {
      navigatorKey.currentState!.push(MaterialPageRoute(builder: (_) => const ForgotPasswordPage()));
    }
    pendingLink = null;
  }
  @override
  Widget build(BuildContext context) => ValueListenableBuilder<double>(valueListenable: airmsFontScale, builder: (context, scale, _) => MaterialApp(
    title: 'AirMS', debugShowCheckedModeBanner: false, navigatorKey: navigatorKey,
    builder: (context, child) => MediaQuery(data: MediaQuery.of(context).copyWith(
      textScaler: TextScaler.linear(MediaQuery.textScalerOf(context).scale(1) * scale)),
      child: AirmsToastHost(child: child ?? const SizedBox.shrink())),
    theme: ThemeData(useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff26866f),
        primary: const Color(0xff244d3b), secondary: const Color(0xff26866f)),
      scaffoldBackgroundColor: const Color(0xfff7f8f7),
      appBarTheme: const AppBarTheme(backgroundColor: Colors.white, foregroundColor: Color(0xff244d3b))),
    home: !ready ? const Scaffold(body: Center(child: CircularProgressIndicator()))
      : session.user == null ? LoginPage(session: session, onLogin: () => setState(() {}))
      : AirmsShell(session: session, onLogout: () => setState(() {}), link: pendingLink,
          onLinkHandled: () { if (mounted) setState(() => pendingLink = null); }),
  ));
}
