import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/sync_service.dart';
import 'ui/theme.dart';
import 'ui/screens/home_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    ChangeNotifierProvider(
      create: (_) => SyncService(),
      child: const LokSyncApp(),
    ),
  );
}

class LokSyncApp extends StatefulWidget {
  const LokSyncApp({super.key});

  @override
  State<LokSyncApp> createState() => _LokSyncAppState();
}

class _LokSyncAppState extends State<LokSyncApp> {
  ThemeMode _themeMode = ThemeMode.system;

  void _toggleTheme() {
    setState(() {
      if (_themeMode == ThemeMode.dark) {
        _themeMode = ThemeMode.light;
      } else {
        _themeMode = ThemeMode.dark;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = _themeMode == ThemeMode.dark ||
        (_themeMode == ThemeMode.system &&
            MediaQuery.of(context).platformBrightness == Brightness.dark);

    return MaterialApp(
      title: 'LokSync',
      debugShowCheckedModeBanner: false,
      theme: LokTheme.lightTheme,
      darkTheme: LokTheme.darkTheme,
      themeMode: _themeMode,
      home: HomeScreen(
        onToggleTheme: _toggleTheme,
        isDark: isDark,
      ),
    );
  }
}
