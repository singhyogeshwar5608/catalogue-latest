import 'package:flutter/foundation.dart';

class ApiConstants {
  ApiConstants._();

  static const String _envBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  );

  static const String _androidEmulatorBaseUrl = 'http://10.0.2.2:8000/api/v1';
  static const String _webFallbackBaseUrl = 'http://127.0.0.1:8000/api/v1';

  static String get baseUrl {
    if (_envBaseUrl.isNotEmpty) {
      return _envBaseUrl;
    }

    if (kIsWeb) {
      return _webFallbackBaseUrl;
    }

    return _androidEmulatorBaseUrl;
  }

  static const String stores = '/stores';
  static const String storeBySlug = '/store';
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String categories = '/categories';
  static const String products = '/products';
  static const String services = '/services';
  static const String boostPlans = '/boost-plans';
}
