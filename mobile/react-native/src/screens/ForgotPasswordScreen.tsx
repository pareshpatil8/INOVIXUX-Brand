import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScreenTemplate } from '../components/ScreenTemplate';
import { useTheme } from '../theme/ThemeProvider';
import { radius, space, targetComfortable, type } from '../theme/tokens';

/**
 * Auth / onboarding template — screen inventory row 4 (Forgot/reset password). Stack push from
 * `SignInScreen`, not a tab, per docs/brand/15-mobile-screen-inventory.md row 4. Single field +
 * a sent-confirmation state, same 44px targets / display-sm headline contract as sign-in.
 */
export function ForgotPasswordScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <ScreenTemplate scroll>
      <View style={styles.headlineBlock}>
        <Text style={[styles.headline, { color: colors.onSurface }]}>Reset password</Text>
        <Text style={[styles.sub, { color: colors.onSurfaceMuted }]}>
          {sent
            ? 'Check your inbox for a reset link.'
            : "Enter the email on your account and we'll send a reset link."}
        </Text>
      </View>

      {!sent ? (
        <>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.onSurfaceMuted }]}>EMAIL</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@company.com"
              placeholderTextColor={colors.onSurfaceSubtle}
              style={[
                styles.input,
                { backgroundColor: colors.surfaceSunken, color: colors.onSurface, borderColor: colors.border },
              ]}
            />
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setSent(true)}
            style={[styles.submit, { backgroundColor: colors.accent }]}
          >
            <Text style={[styles.submitLabel, { color: colors.onAccent }]}>Send reset link</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={[styles.submit, styles.outlined, { borderColor: colors.border }]}
        >
          <Text style={[styles.submitLabel, { color: colors.onSurface }]}>Back to sign in</Text>
        </TouchableOpacity>
      )}
    </ScreenTemplate>
  );
}

const styles = StyleSheet.create({
  headlineBlock: { marginTop: space[6], marginBottom: space[7], gap: space[2] },
  headline: { ...type.displaySm },
  sub: { ...type.body },
  field: { marginBottom: space[4], gap: space[2] },
  label: { ...type.label },
  input: {
    minHeight: targetComfortable,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space[4],
    fontSize: type.body.fontSize,
  },
  submit: {
    minHeight: targetComfortable,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space[3],
  },
  outlined: { backgroundColor: 'transparent', borderWidth: 1 },
  submitLabel: { ...type.body, fontWeight: '600' },
});
