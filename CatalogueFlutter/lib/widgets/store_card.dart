import 'dart:math' as math;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/theme/app_theme.dart';
import '../models/store.dart';

class StoreCard extends StatelessWidget {
  const StoreCard({super.key, required this.store});

  final Store store;

  String? get _bannerUrl {
    if (store.banner != null && store.banner!.isNotEmpty) {
      return store.banner;
    }
    if (store.bannerImages.isNotEmpty) {
      return store.bannerImages.first;
    }
    return null;
  }

  String? get _logoUrl {
    if (store.logo != null && store.logo!.isNotEmpty) {
      return store.logo;
    }
    return null;
  }

  String get _storeUrl {
    final slug = store.slug.isNotEmpty ? store.slug : store.id;
    return 'https://cateloge.com/store/$slug';
  }

  Future<void> _openStore() async {
    await launchUrl(Uri.parse(_storeUrl), mode: LaunchMode.externalApplication);
  }

  Future<void> _openWhatsApp() async {
    final number = (store.whatsapp ?? '').replaceAll(RegExp(r'[^0-9]'), '');
    if (number.isEmpty) return;

    final uri = Uri.parse(
      'https://wa.me/$number?text=${Uri.encodeComponent("Hi, I'm interested in ${store.name}")}',
    );
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.slate200, width: 0.5),
        boxShadow: [
          BoxShadow(
            color: AppTheme.slate900.withValues(alpha: 0.08),
            blurRadius: 6,
            spreadRadius: 0,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 176,
            width: double.infinity,
            child: Stack(
              children: [
                Positioned.fill(
                  child: _bannerUrl != null
                      ? CachedNetworkImage(
                          imageUrl: _bannerUrl!,
                          fit: BoxFit.cover,
                          placeholder: (context, url) =>
                              Container(color: AppTheme.slate100),
                          errorWidget: (context, url, error) =>
                              Container(color: AppTheme.slate100),
                        )
                      : Container(
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [Color(0xFF1E40AF), Color(0xFF0F172A)],
                            ),
                          ),
                        ),
                ),
                Positioned.fill(
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Color(0x33000000), Color(0x99000000)],
                      ),
                    ),
                  ),
                ),
                Positioned(
                  left: 16,
                  bottom: 12,
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.white, width: 2),
                          color: Colors.white,
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: _logoUrl != null
                            ? CachedNetworkImage(
                                imageUrl: _logoUrl!,
                                fit: BoxFit.cover,
                                placeholder: (context, url) =>
                                    Container(color: AppTheme.slate100),
                                errorWidget: (context, url, error) =>
                                    const Icon(
                                      Icons.storefront_outlined,
                                      color: AppTheme.slate500,
                                    ),
                              )
                            : const Icon(
                                Icons.storefront_outlined,
                                color: AppTheme.slate500,
                              ),
                      ),
                      if (store.isVerified)
                        Positioned(
                          right: -6,
                          top: -6,
                          child: ClipPath(
                            clipper: _StarBurstClipper(),
                            child: Container(
                              width: 22,
                              height: 22,
                              color: AppTheme.primary,
                              alignment: Alignment.center,
                              child: const Icon(
                                Icons.check,
                                color: Colors.white,
                                size: 12,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  store.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.slate900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  store.categoryName ?? store.businessType ?? 'General',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(
                      Icons.star_rounded,
                      size: 18,
                      color: AppTheme.amber,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      store.rating.toStringAsFixed(1),
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.slate900,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '(${store.totalReviews})',
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.slate500,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(
                      Icons.location_on_outlined,
                      size: 16,
                      color: AppTheme.slate500,
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        store.location ?? 'Location not available',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppTheme.slate500,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _openStore,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text(
                      'Visit store',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _openWhatsApp,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.whatsapp,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text(
                      'WhatsApp',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StarBurstClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final outer = size.width / 2;
    final inner = outer * 0.72;
    final path = Path();

    for (var i = 0; i < 20; i++) {
      final angle = (i * 18) * math.pi / 180;
      final radius = i.isEven ? outer : inner;
      final point = Offset(
        center.dx + radius * math.cos(angle),
        center.dy + radius * math.sin(angle),
      );

      if (i == 0) {
        path.moveTo(point.dx, point.dy);
      } else {
        path.lineTo(point.dx, point.dy);
      }
    }

    path.close();
    return path;
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}
