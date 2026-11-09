import 'package:flutter/widgets.dart';

/// Flutter equivalent of `[inoAutofocus]` (web/src/app/components/autofocus, INO-466 / INO-31
/// B4). Not a formatter or a visual widget — a thin [FocusNode] lifecycle wrapper, the same
/// "platform-idiomatic non-visual primitive, not a forced widget port" call
/// `ino_keyfilter.dart`'s `TextInputFormatter` made before it
/// (`web/src/app/components/keyfilter/SPEC.md` §5) and that
/// `../../../react-native/src/components/InoAutofocus.ts`'s hook makes on the other mobile
/// track. See `web/src/app/components/autofocus/SPEC.md` §5.
///
/// ## Why this needs to exist at all, next to Flutter's own `autofocus: true`
///
/// Every text-input widget in this library already accepts `autofocus: true`
/// ([TextField], [EditableText], and transitively `ino_input.dart` and friends). That property
/// has the identical limitation the web directive's own doc block opens with: the framework
/// honours it only on the element's **first build**, and nothing re-runs it. A route reached via
/// `go_router`'s `ShellRoute` (or any navigator that keeps the destination widget alive across a
/// param-only navigation) rebuilds the same widget instance without a fresh "first build" —
/// exactly the gap `inoAutofocusTrigger` closes on web, and exactly the reason
/// [InoAutofocus.trigger] exists below: changing it after the first build calls
/// `FocusNode.requestFocus()` again, the same reset a brand-new route would give a text field for
/// free.
///
/// ## No focus-trap interplay to port
///
/// The web directive is a no-op inside an ancestor `[inoFocusTrap]`, because both primitives
/// would otherwise race for the same microtask. `[inoFocusTrap]` itself was never ported to
/// Flutter — `FocusScope` already scopes focus by construction for the lifetime of a modal route
/// (see `web/src/app/components/focus-trap/SPEC.md` §5 and `ino_modal.dart`'s own doc comment) —
/// so there is no ancestor trap for this widget to defer to. It is therefore simpler than the web
/// directive by construction, not by omission.
///
/// Usage: wrap the widget that owns the [FocusNode] you want focused, or pass the node directly
/// to a field's own `focusNode:` parameter and drive re-focus through [InoAutofocus.of] — this
/// widget does not require its child to be the focused element itself, matching the web
/// directive's directive-on-any-element API rather than its wrapper-component form.
class InoAutofocus extends StatefulWidget {
  const InoAutofocus({
    super.key,
    required this.focusNode,
    required this.child,
    this.enabled = true,
    this.trigger,
  });

  /// The node to focus. Callers own its lifecycle (creation and `dispose()`) — this widget only
  /// ever calls `requestFocus()` on it, the same "directive attaches to an element you already
  /// own" contract the web form has.
  final FocusNode focusNode;

  /// On/off switch, default `true`. Set `false` to suppress a single instance of a shared layout
  /// without restructuring it.
  final bool enabled;

  /// Changing this value after the first build re-requests focus — the route-change mechanism
  /// described in the class doc. Has no effect on the very first build, which [initState] already
  /// owns.
  final Object? trigger;

  final Widget child;

  @override
  State<InoAutofocus> createState() => _InoAutofocusState();
}

class _InoAutofocusState extends State<InoAutofocus> {
  @override
  void initState() {
    super.initState();
    if (widget.enabled) {
      // Deferred to the end of the frame: a node cannot usefully take focus until the element
      // tree it belongs to has actually been laid out, the same deferral the web directive makes
      // with `queueMicrotask` before its own first focus move, and for the same reason.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && widget.enabled) {
          widget.focusNode.requestFocus();
        }
      });
    }
  }

  @override
  void didUpdateWidget(InoAutofocus oldWidget) {
    super.didUpdateWidget(oldWidget);
    // `initState` already owns the first activation; only a trigger change (or `enabled` flipping
    // from `false` to `true`) re-requests focus here, mirroring the directive's `ngOnChanges`
    // guard against a redundant double-focus on the very first binding.
    final triggerChanged = widget.trigger != oldWidget.trigger;
    final becameEnabled = widget.enabled && !oldWidget.enabled;
    if (widget.enabled && (triggerChanged || becameEnabled)) {
      widget.focusNode.requestFocus();
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
