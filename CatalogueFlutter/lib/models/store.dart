class Store {
  final String id;
  final String name;
  final String slug;
  final String? logo;
  final String? banner;
  final String? description;
  final String? shortDescription;
  final String? location;
  final String? whatsapp;
  final double rating;
  final int totalReviews;
  final bool isVerified;
  final bool isBoosted;
  final String? categoryName;
  final String? businessType;
  final List<String> bannerImages;

  Store({
    required this.id,
    required this.name,
    required this.slug,
    this.logo,
    this.banner,
    this.description,
    this.shortDescription,
    this.location,
    this.whatsapp,
    this.rating = 0.0,
    this.totalReviews = 0,
    this.isVerified = false,
    this.isBoosted = false,
    this.categoryName,
    this.businessType,
    this.bannerImages = const [],
  });

  factory Store.fromJson(Map<String, dynamic> json) {
    final category = json['category'] as Map<String, dynamic>?;
    final rawImages = category?['banner_images'];
    List<String> bannerImages = [];
    if (rawImages is List) {
      bannerImages = rawImages.whereType<String>().where((url) => url.isNotEmpty).toList();
    }
    return Store(
      id: json['id'].toString(),
      name: json['name'] ?? '',
      slug: json['slug'] ?? '',
      logo: json['logo'],
      banner: json['banner'],
      description: json['description'],
      shortDescription: json['short_description'],
      location: json['location'] ?? json['address'],
      whatsapp: json['whatsapp'] ?? json['phone'],
      rating: double.tryParse(json['rating']?.toString() ?? '0') ?? 0.0,
      totalReviews: int.tryParse(json['total_reviews']?.toString() ?? '0') ?? 0,
      isVerified: json['is_verified'] == true,
      isBoosted: json['is_boosted'] == true,
      categoryName: category?['name'],
      businessType: json['business_type'],
      bannerImages: bannerImages,
    );
  }
}
