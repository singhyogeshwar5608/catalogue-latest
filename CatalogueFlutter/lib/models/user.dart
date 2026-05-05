class UserModel {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? storeSlug;
  final String? token;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.storeSlug,
    this.token,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'].toString(),
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? 'user',
      storeSlug: json['store_slug'] ?? json['storeSlug'],
      token: json['token'],
    );
  }

  bool get isAdmin => role == 'super_admin';

  bool get hasStore => storeSlug != null && storeSlug!.isNotEmpty;
}
