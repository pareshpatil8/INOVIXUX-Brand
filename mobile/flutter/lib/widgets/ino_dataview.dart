import 'package:flutter/widgets.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import 'ino_label.dart';

/// `InoDataView` — Flutter port of `<ino-dataview>`
/// (`web/src/app/components/dataview`, INO-454 / INO-31 Phase B3).
///
/// **List mode only** — doc 26 §5's Notes column reads "Port both (list mode)". No grid layout,
/// no layout switch, no ported paginator: the web component's `<ino-select-button>` layout
/// switch has nothing to switch between here, and the web `<ino-paginator>` integration is
/// deliberately not ported either, for the same desktop-idiom reasoning `ino-paginator`'s own
/// `SPEC.md` §1 already recorded — a phone screen answers "get more data" with `ListView`'s
/// native scroll-position listener, not a row of page-number buttons. See
/// `web/src/app/components/dataview/SPEC.md` §7.
///
/// A thin, generic `ListView.builder` wrapper — `itemBuilder`/`keyFor` are plain Dart-callback
/// conventions rather than a ported template-directive system (there is no Angular `ng-template`
/// equivalent on this platform, and `InoListbox`'s own port documents the same "no shared build
/// graph" reasoning for leaving its web-only `optionTemplate` slot unported).
class InoDataView<T> extends StatefulWidget {
  final List<T> data;
  final Widget Function(BuildContext context, T item, int index) itemBuilder;
  final Key Function(T item, int index)? keyFor;

  /// Visible caption above the list — the "list label" doc 26 §5 calls out.
  final String? label;
  final bool loading;

  /// Placeholder rows drawn while [loading] is true. 0 falls back to 6.
  final int skeletonItemCount;
  final String emptyMessage;
  final WidgetBuilder? emptyBuilder;

  /// Fires once content within [loadMoreThreshold] of the bottom scrolls into view — the
  /// mobile-idiom replacement for the web component's `<ino-paginator>` integration
  /// (SPEC.md §7).
  final VoidCallback? onEndReached;
  final double loadMoreThreshold;

  const InoDataView({
    super.key,
    required this.data,
    required this.itemBuilder,
    this.keyFor,
    this.label,
    this.loading = false,
    this.skeletonItemCount = 0,
    this.emptyMessage = 'No records found.',
    this.emptyBuilder,
    this.onEndReached,
    this.loadMoreThreshold = 200,
  });

  @override
  State<InoDataView<T>> createState() => _InoDataViewState<T>();
}

class _InoDataViewState<T> extends State<InoDataView<T>> {
  final ScrollController _controller = ScrollController();

  @override
  void initState() {
    super.initState();
    if (widget.onEndReached != null) {
      _controller.addListener(_handleScroll);
    }
  }

  void _handleScroll() {
    final position = _controller.position;
    if (position.pixels >= position.maxScrollExtent - widget.loadMoreThreshold) {
      widget.onEndReached?.call();
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_handleScroll);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final isEmpty = !widget.loading && widget.data.isEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.label != null) ...[
          InoLabel(widget.label!),
          const SizedBox(height: InoSpace.s3),
        ],
        Expanded(
          child: isEmpty
              ? (widget.emptyBuilder?.call(context) ??
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: InoSpace.s7),
                      child: Text(
                        widget.emptyMessage,
                        style: TextStyle(color: colors.onSurfaceMuted),
                      ),
                    ),
                  ))
              : widget.loading
                  ? Semantics(
                      label: 'Loading',
                      child: ListView.builder(
                        itemCount: widget.skeletonItemCount > 0 ? widget.skeletonItemCount : 6,
                        itemBuilder: (context, index) => Container(
                          height: InoTarget.comfortable,
                          margin: const EdgeInsets.only(bottom: InoSpace.s3),
                          decoration: BoxDecoration(
                            color: colors.borderSoft,
                            borderRadius: BorderRadius.circular(InoRadius.md),
                          ),
                        ),
                      ),
                    )
                  : ListView.builder(
                      controller: _controller,
                      itemCount: widget.data.length,
                      itemBuilder: (context, index) {
                        final item = widget.data[index];
                        return KeyedSubtree(
                          key: widget.keyFor?.call(item, index) ?? ValueKey(index),
                          child: widget.itemBuilder(context, item, index),
                        );
                      },
                    ),
        ),
      ],
    );
  }
}
