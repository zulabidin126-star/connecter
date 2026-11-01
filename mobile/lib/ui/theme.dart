import 'package:flutter/material.dart';

class LokTheme {
  // Light Theme (Libadwaita / KDE Warm Paper)
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF211C19),
        brightness: Brightness.light,
        surface: const Color(0xFFF8F6F2),
        primary: const Color(0xFF211C19),
        onPrimary: Colors.white,
      ),
      scaffoldBackgroundColor: const Color(0xFFF4EDE7),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: Color(0x0F000000)),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: Color(0xFF211C19),
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  // Dark Theme (KDE Breeze Dark / Libadwaita Obsidian)
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF10B981),
        brightness: Brightness.dark,
        surface: const Color(0xFF1E1E24),
        primary: Colors.white,
        onPrimary: const Color(0xFF16161A),
      ),
      scaffoldBackgroundColor: const Color(0xFF141418),
      cardTheme: CardThemeData(
        color: const Color(0xFF1C1C22),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: Color(0x1AFFFFFF)),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
