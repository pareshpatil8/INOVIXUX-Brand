import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../widgets/screen_template.dart';
import 'detail_screen.dart';

/// List template (docs/brand/13-mobile-app-patterns.md §2) — screen inventory row 5
/// (Home/dashboard) and, with the same widget, row 6 (generic list). Placeholder rows only — no
/// real product data; the mobile app's core product surface (tab slot 2) is still an open
/// product question per docs/brand/15-mobile-screen-inventory.md §2, not a branding decision.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  static const _rows = [
    {'id': '1', 'title': 'Sample item one', 'meta': 'Updated today'},
    {'id': '2', 'title': 'Sample item two', 'meta': 'Updated yesterday'},
    {'id': '3', 'title': 'Sample item three', 'meta': 'Updated 3 days ago'},
  ];

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    return ScreenTemplate(
      title: 'Home',
      scroll: false,
      child: ListView.separated(
        itemCount: _rows.length,
        separatorBuilder: (_, __) => const SizedBox(height: InoSpace.s2),
        itemBuilder: (context, i) {
          final row = _rows[i];
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
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(row['title']!, style: Theme.of(context).textTheme.bodyMedium),
                        Text(row['meta']!, style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                    Icon(LucideIcons.chevronRight, size: 20, color: colors.onSurfaceMuted),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
