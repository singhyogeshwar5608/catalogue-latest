class Product {
  final String id;
  final String name;
  final double price;
  final double? originalPrice;
  final String? image;
  final String? description;
  final String? category;
  final double rating;

  Product({
    required this.id,
    required this.name,
    required this.price,
    this.originalPrice,
    this.image,
    this.description,
    this.category,
    this.rating = 4.5,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'].toString(),
      name: json['title'] ?? json['name'] ?? '',
      price: double.tryParse(json['price']?.toString() ?? '0') ?? 0.0,
      originalPrice: json['original_price'] != null
          ? double.tryParse(json['original_price'].toString())
          : null,
      image: json['image'],
      description: json['description'],
      category: json['category'],
      rating: double.tryParse(json['rating']?.toString() ?? '4.5') ?? 4.5,
    );
  }
}
