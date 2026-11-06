import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:inovixux_mobile/widgets/ino_keyfilter.dart';

/// `InoKeyfilterFormatter.formatEditUpdate` regression coverage (INO-420 B1), mirroring
/// `web/src/app/components/keyfilter/ino-keyfilter.spec.ts`'s selection-replacement cases and
/// `mobile/react-native/src/components/InoKeyfilter.ts`'s equivalent `diffEdit` port. Pure-logic
/// tests against the formatter directly — no widget pump needed, same convention
/// `deep_link_test.dart` uses for this package's other non-visual contracts.
void main() {
  TextEditingValue value(String text) =>
      TextEditingValue(text: text, selection: TextSelection.collapsed(offset: text.length));

  group('int preset — selection replacement', () {
    late InoKeyfilterFormatter formatter;
    final rejected = <String>[];

    setUp(() {
      rejected.clear();
      formatter = InoKeyfilterFormatter(preset: InoKeyfilterPreset.int_, onReject: rejected.add);
    });

    test('a pure deletion passes through untouched', () {
      final result = formatter.formatEditUpdate(value('123'), value('12'));
      expect(result.text, '12');
      expect(rejected, isEmpty);
    });

    test('select all, type "-" keeps the replacement minus (regression: used to resurrect "5")', () {
      final result = formatter.formatEditUpdate(value('-5'), value('-'));
      expect(result.text, '-');
      expect(rejected, isEmpty);
    });

    test('select the trailing digit, type "-9" rejects only the stray minus', () {
      // "15" with "5" selected, typed over with "-9" -> raw edit is "1-9".
      final result = formatter.formatEditUpdate(value('15'), value('1-9'));
      expect(result.text, '19');
      expect(rejected, ['-9']);
    });

    test('select the trailing digit, type "x" rejects the letter entirely (no bypass)', () {
      final result = formatter.formatEditUpdate(value('15'), value('1x'));
      expect(result.text, '1');
      expect(rejected, ['x']);
    });

    test('select all, type "x" rejects the letter entirely (no bypass)', () {
      final result = formatter.formatEditUpdate(value('123'), value('x'));
      expect(result.text, '');
      expect(rejected, ['x']);
    });
  });

  group('num preset — selection replacement', () {
    test('select all, type "." keeps the replacement decimal point', () {
      final formatter = InoKeyfilterFormatter(preset: InoKeyfilterPreset.num_);
      final result = formatter.formatEditUpdate(value('1.5'), value('.'));
      expect(result.text, '.');
    });

    test('select all, type "-" keeps the replacement minus even though the old value had one', () {
      final formatter = InoKeyfilterFormatter(preset: InoKeyfilterPreset.num_);
      final result = formatter.formatEditUpdate(value('-1.5'), value('-'));
      expect(result.text, '-');
    });
  });
}
