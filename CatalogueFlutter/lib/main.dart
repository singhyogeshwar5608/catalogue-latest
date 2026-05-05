import 'package:flutter/material.dart';

import 'core/theme/app_theme.dart';
import 'screens/home/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CatelogApp());
}

class CatelogApp extends StatelessWidget {
  const CatelogApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Cateloge',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const HomeScreen(),
    );
  }
}
