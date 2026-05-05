import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../models/store.dart';
import '../../widgets/store_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Store> _stores = [];
  bool _isLoading = true;
  String? _error;
  String _activeCategory = 'all';

  @override
  void initState() {
    super.initState();
    _fetchStores();
  }

  Future<void> _fetchStores() async {
    setState(() {
      _error = null;
      if (_stores.isEmpty) _isLoading = true;
    });

    try {
      final response = await ApiClient.get(ApiConstants.stores);
      final rawStores = _extractStoreList(response);
      final stores = rawStores.map(Store.fromJson).toList();

      setState(() {
        _stores = stores;
      });
    } catch (_) {
      setState(() {
        _error = 'Unable to load stores right now.';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  List<Map<String, dynamic>> _extractStoreList(Map<String, dynamic> response) {
    final candidates = <dynamic>[
      response['stores'],
      response['data'],
      (response['data'] is Map<String, dynamic>)
          ? (response['data'] as Map<String, dynamic>)['stores']
          : null,
      (response['data'] is Map<String, dynamic>)
          ? (response['data'] as Map<String, dynamic>)['data']
          : null,
    ];

    for (final candidate in candidates) {
      if (candidate is List) {
        return candidate
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();
      }
    }

    return const [];
  }

  List<String> get _categories {
    final labels =
        _stores
            .map(
              (store) =>
                  (store.categoryName ?? store.businessType ?? '').trim(),
            )
            .where((name) => name.isNotEmpty)
            .toSet()
            .toList()
          ..sort();

    return ['all', ...labels];
  }

  List<Store> get _filteredStores {
    if (_activeCategory == 'all') return _stores;
    return _stores.where((store) {
      final label = (store.categoryName ?? store.businessType ?? '').trim();
      return label.toLowerCase() == _activeCategory.toLowerCase();
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: Row(
          children: [
            Container(
              height: 34,
              width: 34,
              decoration: BoxDecoration(
                color: AppTheme.primary,
                borderRadius: BorderRadius.circular(12),
              ),
              alignment: Alignment.center,
              child: const Icon(
                Icons.storefront,
                color: Colors.white,
                size: 19,
              ),
            ),
            const SizedBox(width: 10),
            const Text(
              'Catelog',
              style: TextStyle(
                color: AppTheme.slate900,
                fontSize: 20,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.search_rounded, color: AppTheme.slate700),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchStores,
        color: AppTheme.primary,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(child: _buildCategoryChips()),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(12, 6, 12, 20),
              sliver: SliverToBoxAdapter(
                child: _isLoading
                    ? _buildShimmer()
                    : _error != null
                    ? _buildErrorState()
                    : _buildStoreLayout(context),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryChips() {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
      color: Colors.white,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: _categories.map((category) {
            final isActive = _activeCategory == category;
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(
                  category == 'all' ? 'All stores' : category,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isActive ? Colors.white : AppTheme.slate600,
                  ),
                ),
                selected: isActive,
                onSelected: (_) {
                  setState(() {
                    _activeCategory = category;
                  });
                },
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(100),
                  side: BorderSide(
                    color: isActive ? AppTheme.slate900 : AppTheme.slate200,
                  ),
                ),
                backgroundColor: Colors.white,
                selectedColor: AppTheme.slate900,
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 8,
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildStoreLayout(BuildContext context) {
    final stores = _filteredStores;
    if (stores.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppTheme.slate200),
        ),
        child: const Center(
          child: Text(
            'No stores in this category yet',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppTheme.slate900,
            ),
          ),
        ),
      );
    }

    final width = MediaQuery.of(context).size.width;

    if (width < 700) {
      final first = stores.first;
      final rest = stores.skip(1).toList();

      return Column(
        children: [
          StoreCard(store: first),
          if (rest.isNotEmpty) const SizedBox(height: 12),
          if (rest.isNotEmpty)
            GridView.builder(
              itemCount: rest.length,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.45,
              ),
              itemBuilder: (_, index) => StoreCard(store: rest[index]),
            ),
        ],
      );
    }

    final crossAxisCount = width >= 1100 ? 3 : 2;
    return GridView.builder(
      itemCount: stores.length,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        childAspectRatio: 0.55,
      ),
      itemBuilder: (_, index) => StoreCard(store: stores[index]),
    );
  }

  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: AppTheme.slate200,
      highlightColor: AppTheme.slate100,
      child: GridView.builder(
        itemCount: 6,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 0.45,
        ),
        itemBuilder: (context, shimmerIndex) {
          return Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
            ),
          );
        },
      ),
    );
  }

  Widget _buildErrorState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF1F2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Text(
        _error ?? 'Something went wrong.',
        style: const TextStyle(
          color: Color(0xFFBE123C),
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
