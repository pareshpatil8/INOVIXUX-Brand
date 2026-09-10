import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../widgets/confirm_action_sheet.dart';
import '../widgets/screen_template.dart';

/// Detail template (docs/brand/13-mobile-app-patterns.md §2) — screen inventory row 7. Header
/// (back handled by Navigator's default AppBar-less back gesture) → sunken-variant section for
/// read-only/reference data, e.g. a submitted document's extracted fields. Delete action below
/// proves the Modal-action template (screen inventory row 11) from a real call site rather than
/// only in isolation.
class DetailScreen extends StatelessWidget {
  final String id;
  final String title;

  const DetailScreen({super.key, required this.id, required this.title});

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final fields = {
      'Status': 'Active',
      'Created': '2026-09-01',
      'Reference': 'REF-${id.padLeft(4, '0')}',
    };

    return ScreenTemplate(
      title: title,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(InoSpace.s4),
            decoration: BoxDecoration(
              color: colors.surfaceSunken,
              borderRadius: BorderRadius.circular(InoRadius.lg),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: fields.entries
                  .map((e) => Padding(
                        padding: const EdgeInsets.only(bottom: InoSpace.s3),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(e.key, style: Theme.of(context).textTheme.bodySmall),
                            Text(e.value, style: Theme.of(context).textTheme.bodyMedium),
                          ],
                        ),
                      ))
                  .toList(),
            ),
          ),
          const SizedBox(height: InoSpace.s5),
          OutlinedButton(
            onPressed: () async {
              final confirmed = await showConfirmActionSheet(
                context,
                title: 'Delete "$title"?',
                body: 'This can\'t be undone.',
              );
              if (confirmed == true && context.mounted) {
                Navigator.of(context).pop();
              }
            },
            style: OutlinedButton.styleFrom(
              foregroundColor: colors.danger,
              side: BorderSide(color: colors.danger),
              minimumSize: const Size.fromHeight(InoTarget.comfortable),
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}
