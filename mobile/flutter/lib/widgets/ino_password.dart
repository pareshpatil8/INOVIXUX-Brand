import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// A single row in the policy hint panel; mirrors the web component's
/// `InoPasswordPolicyRule` (label + a live `test` predicate).
class InoPasswordPolicyRule {
  final String label;
  final bool Function(String value) test;

  const InoPasswordPolicyRule({required this.label, required this.test});
}

/// Mirrors the web component's `INO_PASSWORD_DEFAULT_POLICY_RULES`.
final List<InoPasswordPolicyRule> inoPasswordDefaultPolicyRules = [
  InoPasswordPolicyRule(label: 'At least 8 characters', test: (v) => v.length >= 8),
  InoPasswordPolicyRule(
    label: 'Upper and lower case letters',
    test: (v) => v.contains(RegExp(r'[a-z]')) && v.contains(RegExp(r'[A-Z]')),
  ),
  InoPasswordPolicyRule(label: 'At least one number', test: (v) => v.contains(RegExp(r'\d'))),
  InoPasswordPolicyRule(label: 'At least one symbol', test: (v) => v.contains(RegExp(r'[^A-Za-z0-9]'))),
];

const List<String> _inoPasswordStrengthLabels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];

int _scorePassword(String value) {
  if (value.isEmpty) return 0;
  var score = 0;
  if (value.length >= 8) score++;
  if (value.contains(RegExp(r'[a-z]')) && value.contains(RegExp(r'[A-Z]'))) score++;
  if (value.contains(RegExp(r'\d'))) score++;
  if (value.contains(RegExp(r'[^A-Za-z0-9]'))) score++;
  if (value.length >= 12) score++;
  return score > 4 ? 4 : score;
}

/// `<InoPassword>` — Flutter port of `<ino-password>` (web/src/app/components/password, INO-406 /
/// INO-31 Phase B1). Carries the reveal toggle and strength meter, per SPEC.md §9: the Caps Lock
/// warning is web-only, since a touch keyboard has no reliable modifier-state signal to key it off.
class InoPassword extends StatefulWidget {
  final String? label;
  final String? hint;
  final String? error;
  final String? initialValue;
  final InoControlSize size;
  final bool disabled;
  final bool showStrengthMeter;
  final List<InoPasswordPolicyRule> policyRules;
  final ValueChanged<String>? onChanged;

  const InoPassword({
    super.key,
    this.label,
    this.hint,
    this.error,
    this.initialValue,
    this.size = InoControlSize.standard,
    this.disabled = false,
    this.showStrengthMeter = true,
    this.policyRules = const [],
    this.onChanged,
  });

  @override
  State<InoPassword> createState() => _InoPasswordState();
}

class _InoPasswordState extends State<InoPassword> {
  final FocusNode _focusNode = FocusNode();
  bool _focused = false;
  bool _revealed = false;
  String _value = '';

  @override
  void initState() {
    super.initState();
    _value = widget.initialValue ?? '';
    _focusNode.addListener(() => setState(() => _focused = _focusNode.hasFocus));
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.inoColors;
    final invalid = widget.error != null && widget.error!.isNotEmpty;
    final borderColor = invalid ? colors.danger : _focused ? colors.accent : colors.border;
    final score = _scorePassword(_value);
    final meterColor = score <= 1 ? colors.danger : score <= 2 ? colors.warning : colors.success;

    return Opacity(
      opacity: widget.disabled ? 0.5 : 1,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (widget.label != null) ...[
            Text(
              widget.label!,
              style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600, color: colors.onSurface),
            ),
            const SizedBox(height: InoSpace.s2),
          ],
          SizedBox(
            height: widget.size.height,
            child: Stack(
              alignment: Alignment.centerRight,
              children: [
                TextField(
                  focusNode: _focusNode,
                  enabled: !widget.disabled,
                  obscureText: !_revealed,
                  onChanged: (v) {
                    setState(() => _value = v);
                    widget.onChanged?.call(v);
                  },
                  controller: widget.initialValue != null
                      ? TextEditingController(text: widget.initialValue)
                      : null,
                  style: TextStyle(fontSize: widget.size.fontSize, color: colors.onSurface),
                  decoration: InputDecoration(
                    isDense: true,
                    filled: true,
                    fillColor: colors.surfaceSunken,
                    contentPadding: EdgeInsets.only(
                      left: widget.size.paddingInline,
                      right: widget.size.paddingInline + 40,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(InoRadius.md),
                      borderSide: BorderSide(color: colors.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(InoRadius.md),
                      borderSide: BorderSide(color: colors.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(InoRadius.md),
                      borderSide: BorderSide(color: borderColor, width: 2),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(right: InoSpace.s2),
                  child: Semantics(
                    button: true,
                    label: _revealed ? 'Hide password' : 'Show password',
                    child: GestureDetector(
                      onTap: widget.disabled ? null : () => setState(() => _revealed = !_revealed),
                      child: Text(
                        _revealed ? 'Hide' : 'Show',
                        style: TextStyle(fontSize: 12.5, color: colors.onSurfaceMuted),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (widget.showStrengthMeter) ...[
            const SizedBox(height: InoSpace.s2),
            Semantics(
              liveRegion: true,
              child: Row(
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        for (var i = 0; i < 4; i++) ...[
                          Expanded(
                            child: Container(
                              height: 4,
                              decoration: BoxDecoration(
                                color: i < score ? meterColor : colors.border,
                                borderRadius: BorderRadius.circular(InoRadius.pill),
                              ),
                            ),
                          ),
                          if (i < 3) const SizedBox(width: InoSpace.s1),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: InoSpace.s2),
                  SizedBox(
                    width: 60,
                    child: Text(
                      _value.isEmpty ? '' : _inoPasswordStrengthLabels[score],
                      style: TextStyle(fontSize: 12.5, color: colors.onSurfaceMuted),
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (widget.policyRules.isNotEmpty) ...[
            const SizedBox(height: InoSpace.s2),
            Semantics(
              label: 'Password requirements',
              child: Container(
                padding: const EdgeInsets.all(InoSpace.s3),
                decoration: BoxDecoration(
                  color: colors.surfaceRaised,
                  borderRadius: BorderRadius.circular(InoRadius.md),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: widget.policyRules.map((rule) {
                    final met = rule.test(_value);
                    return Text(
                      '${met ? '✓' : '○'} ${rule.label}',
                      style: TextStyle(fontSize: 12.5, color: met ? colors.onSurface : colors.onSurfaceMuted),
                    );
                  }).toList(),
                ),
              ),
            ),
          ],
          if (invalid) ...[
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
      ),
    );
  }
}
