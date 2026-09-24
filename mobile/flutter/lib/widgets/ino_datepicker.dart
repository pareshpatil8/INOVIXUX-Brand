import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// `InoDatepicker` — Flutter port of `<ino-datepicker>`
/// (`web/src/app/components/datepicker`, INO-154 / INO-31 T-8).
///
/// Scope, per the plan rev 9 §5 porting rule ("Flutter is a real port, ~40% the cost of the web
/// component"): a **single-mode** calendar grid with touch selection, [InoControlSize], `disabled`/
/// `loading`, and `minDate`/`maxDate`. Range, multiple-selection and the time picker are NOT
/// ported — see `web/src/app/components/datepicker/SPEC.md`, "Mobile parity" section, for the
/// reasoning. Month/year drill-up view is also out of scope: this widget only ever shows the day
/// grid with prev/next month navigation, matching the RN port's scope exactly.
///
/// Web-only states with no touch equivalent are dropped rather than faked — `hover` and the
/// `:focus-visible` ring — same rule [InoButton]'s doc comment states; `:active` (pressed),
/// `disabled` and `loading` carry over.
class InoDatepicker extends StatefulWidget {
  final String? label;
  final String? hint;
  final String? error;
  /// `null` = no selection.
  final DateTime? value;
  final ValueChanged<DateTime> onChanged;
  final InoControlSize size;
  final DateTime? minDate;
  final DateTime? maxDate;
  final bool disabled;
  final bool loading;
  /// First day of the visible week: 0 = Sunday, 1 = Monday (default — matches the web
  /// component's `en-IN`/APAC default, see its class doc comment §Locale).
  final int firstDayOfWeek;
  /// Month currently displayed; defaults to [value] or today. Uncontrolled if omitted.
  final DateTime? initialMonth;

  const InoDatepicker({
    super.key,
    this.label,
    this.hint,
    this.error,
    required this.value,
    required this.onChanged,
    this.size = InoControlSize.standard,
    this.minDate,
    this.maxDate,
    this.disabled = false,
    this.loading = false,
    this.firstDayOfWeek = 1,
    this.initialMonth,
  });

  @override
  State<InoDatepicker> createState() => _InoDatepickerState();
}

DateTime _startOfDay(DateTime d) => DateTime(d.year, d.month, d.day);

bool _sameDay(DateTime? a, DateTime? b) =>
    a != null && b != null && a.year == b.year && a.month == b.month && a.day == b.day;

DateTime _addMonths(DateTime d, int n) {
  final total = d.month - 1 + n;
  final year = d.year + total ~/ 12;
  final month = total % 12 + 1;
  final daysInTarget = DateTime(year, month + 1, 0).day;
  return DateTime(year, month, d.day > daysInTarget ? daysInTarget : d.day);
}

List<List<DateTime>> _buildWeeks(DateTime viewDate, int firstDayOfWeek) {
  final monthStart = DateTime(viewDate.year, viewDate.month, 1);
  // DateTime#weekday: 1=Mon..7=Sun; normalize to 0=Sun..6=Sat to match firstDayOfWeek's convention.
  final monthStartDow = monthStart.weekday % 7;
  final offset = (monthStartDow - firstDayOfWeek + 7) % 7;
  final gridStart = monthStart.subtract(Duration(days: offset));

  return List.generate(6, (w) => List.generate(7, (d) => gridStart.add(Duration(days: w * 7 + d))));
}

const _weekdayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const _monthLong = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

class _InoDatepickerState extends State<InoDatepicker> {
  late DateTime _viewDate;

  @override
  void initState() {
    super.initState();
    _viewDate = _startOfDay(widget.initialMonth ?? widget.value ?? DateTime.now());
  }

  bool get _nonInteractive => widget.disabled || widget.loading;

  bool _isDisabled(DateTime d) {
    final day = _startOfDay(d);
    if (widget.minDate != null && day.isBefore(_startOfDay(widget.minDate!))) return true;
    if (widget.maxDate != null && day.isAfter(_startOfDay(widget.maxDate!))) return true;
    return false;
  }

  void _select(DateTime d) {
    if (_nonInteractive || _isDisabled(d)) return;
    widget.onChanged(d);
    if (d.month != _viewDate.month || d.year != _viewDate.year) {
      setState(() => _viewDate = DateTime(d.year, d.month, 1));
    }
  }

  void _navigate(int delta) {
    final next = _addMonths(_viewDate, delta);
    setState(() => _viewDate = next);
    SemanticsService.sendAnnouncement(
        View.of(context), '${_monthLong[next.month - 1]} ${next.year}', TextDirection.ltr);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final dims = widget.size;
    final weeks = _buildWeeks(_viewDate, widget.firstDayOfWeek);
    final weekdayLabels =
        List.generate(7, (i) => _weekdayShort[(widget.firstDayOfWeek + i) % 7]);
    final monthLabel = '${_monthLong[_viewDate.month - 1]} ${_viewDate.year}';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (widget.label != null) ...[
          Text(widget.label!, style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600, color: colors.onSurface)),
          const SizedBox(height: InoSpace.s2),
        ],
        Container(
          decoration: BoxDecoration(
            color: colors.surfaceRaised,
            border: Border.all(color: colors.border),
            borderRadius: BorderRadius.circular(InoRadius.lg),
          ),
          padding: const EdgeInsets.all(InoSpace.s4),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _NavButton(
                    label: '‹',
                    semanticLabel: 'Previous month',
                    onPressed: _nonInteractive ? null : () => _navigate(-1),
                    colors: colors,
                  ),
                  Text(monthLabel, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: colors.onSurface)),
                  _NavButton(
                    label: '›',
                    semanticLabel: 'Next month',
                    onPressed: _nonInteractive ? null : () => _navigate(1),
                    colors: colors,
                  ),
                ],
              ),
              const SizedBox(height: InoSpace.s2),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: weekdayLabels
                    .map((wd) => SizedBox(
                          width: 44,
                          child: Text(
                            wd.toUpperCase(),
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: colors.onSurfaceMuted),
                          ),
                        ))
                    .toList(),
              ),
              for (final week in weeks)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: week.map((d) => _DayCell(
                        date: d,
                        inMonth: d.month == _viewDate.month,
                        selected: _sameDay(d, widget.value),
                        today: _sameDay(d, DateTime.now()),
                        disabled: _nonInteractive || _isDisabled(d),
                        colors: colors,
                        fontSize: dims.fontSize - 2,
                        onTap: () => _select(d),
                      )).toList(),
                ),
            ],
          ),
        ),
        if (widget.error != null) ...[
          const SizedBox(height: InoSpace.s2),
          Semantics(
            liveRegion: true,
            child: Text(widget.error!, style: TextStyle(fontSize: 12.5, color: colors.danger, fontWeight: FontWeight.w600)),
          ),
        ] else if (widget.hint != null) ...[
          const SizedBox(height: InoSpace.s2),
          Text(widget.hint!, style: TextStyle(fontSize: 12.5, color: colors.onSurfaceMuted)),
        ],
      ],
    );
  }
}

class _NavButton extends StatelessWidget {
  final String label;
  final String semanticLabel;
  final VoidCallback? onPressed;
  final InoPalette colors;

  const _NavButton({required this.label, required this.semanticLabel, required this.onPressed, required this.colors});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: semanticLabel,
      enabled: onPressed != null,
      child: GestureDetector(
        onTap: onPressed,
        child: SizedBox(
          width: 44,
          height: 44,
          child: Center(
            child: Opacity(
              opacity: onPressed == null ? 0.5 : 1,
              child: Text(label, style: TextStyle(fontSize: 17, color: colors.onSurfaceMuted)),
            ),
          ),
        ),
      ),
    );
  }
}

class _DayCell extends StatefulWidget {
  final DateTime date;
  final bool inMonth;
  final bool selected;
  final bool today;
  final bool disabled;
  final InoPalette colors;
  final double fontSize;
  final VoidCallback onTap;

  const _DayCell({
    required this.date,
    required this.inMonth,
    required this.selected,
    required this.today,
    required this.disabled,
    required this.colors,
    required this.fontSize,
    required this.onTap,
  });

  @override
  State<_DayCell> createState() => _DayCellState();
}

class _DayCellState extends State<_DayCell> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final colors = widget.colors;
    final selected = widget.selected;
    const monthNamesFull = _monthLong;
    final label = '${widget.date.day} ${monthNamesFull[widget.date.month - 1]} ${widget.date.year}';

    return Semantics(
      button: true,
      selected: selected,
      enabled: !widget.disabled,
      label: label,
      child: GestureDetector(
        onTapDown: widget.disabled ? null : (_) => setState(() => _pressed = true),
        onTapUp: widget.disabled ? null : (_) => setState(() => _pressed = false),
        onTapCancel: widget.disabled ? null : () => setState(() => _pressed = false),
        onTap: widget.disabled ? null : widget.onTap,
        child: Container(
          width: 44,
          height: 44,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? colors.accent : (_pressed ? colors.surfaceSunken : null),
            borderRadius: BorderRadius.circular(InoRadius.sm),
            border: (widget.today && !selected) ? Border.all(color: colors.border) : null,
          ),
          child: Opacity(
            opacity: widget.disabled ? 0.4 : 1,
            child: Text(
              '${widget.date.day}',
              style: TextStyle(
                fontSize: widget.fontSize,
                fontWeight: (selected || widget.today) ? FontWeight.w600 : FontWeight.w400,
                color: selected
                    ? colors.onAccent
                    : (widget.inMonth ? colors.onSurface : colors.onSurfaceSubtle),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
