import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../widgets/empty_state.dart';
import '../widgets/screen_template.dart';
import 'detail_screen.dart';

/// List template + a form-control header — screen inventory row 8 (Search/filter). Per
/// docs/brand/15-mobile-screen-inventory.md row 8, this is deliberately not a new template: a
/// search `TextField` on top of the same list-row composition [HomeScreen] uses. Pushed, usually
/// from a List's header action — here, from [HomeScreen]'s search [ScreenIconAction].
class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  static const _all = [
    {'id': '1', 'title': 'Sample item one', 'meta': 'Updated today'},
    {'id': '2', 'title': 'Sample item two', 'meta': 'Updated yesterday'},
    {'id': '3', 'title': 'Sample item three', 'meta': 'Updated 3 days ago'},
  ];

  final _query = TextEditingController();
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final results =
        _all.where((r) => r['title']!.toLowerCase().contains(_q.toLowerCase())).toList();

    return ScreenTemplate(
      scroll: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: InoSpace.s2),
          TextField(
            controller: _query,
            autofocus: true,
            onChanged: (v) => setState(() => _q = v),
            decoration: InputDecoration(
              hintText: 'Search',
              prefixIcon: const Icon(LucideIcons.search, size: 20),
              suffixIcon: _q.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(LucideIcons.x, size: 18),
                      onPressed: () => setState(() {
                        _query.clear();
                        _q = '';
                      }),
                    ),
            ),
          ),
          const SizedBox(height: InoSpace.s4),
          Expanded(
            child: results.isEmpty
                ? const EmptyState(icon: LucideIcons.searchX, headline: 'No results', body: 'Try a different search.')
                : ListView.separated(
                    itemCount: results.length,
                    separatorBuilder: (_, __) => const SizedBox(height: InoSpace.s2),
                    itemBuilder: (context, i) {
                      final row = results[i];
                      return Material(
                        color: colors.surfaceRaised,
                        borderRadius: BorderRadius.circular(InoRadius.lg),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(InoRadius.lg),
                          onTap: () => Navigator.of(context).push(MaterialPageRoute(
                            builder: (_) => DetailScreen(id: row['id']!, title: row['title']!),
                          )),
                          child: Container(
                            constraints: const BoxConstraints(minHeight: inoRowMinHeight),
                            padding: const EdgeInsets.symmetric(horizontal: InoSpace.s4, vertical: InoSpace.s3),
                            decoration: BoxDecoration(
                              border: Border.all(color: colors.borderSoft),
                              borderRadius: BorderRadius.circular(InoRadius.lg),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(row['title']!, style: Theme.of(context).textTheme.bodyMedium),
                                Icon(LucideIcons.chevronRight, size: 20, color: colors.onSurfaceMuted),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
