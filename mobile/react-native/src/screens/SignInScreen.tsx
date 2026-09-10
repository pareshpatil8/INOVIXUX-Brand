import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScreenTemplate } from '../components/ScreenTemplate';
import { useTheme } from '../theme/ThemeProvider';
import { radius, space, targetComfortable, type } from '../theme/tokens';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../navigation/RootNavigator';

/**
 * Auth / onboarding template (docs/brand/13-mobile-app-patterns.md §2) — covers screen inventory
 * rows 3 (Sign in/Sign up) and 4 (Forgot/reset password, pushed from here).
 * Single-column form shell, `--ino-target-comfortable` (44px) on every input/button, display-sm
 * (38px) headline — not the 56px desktop size.
 */
type Props = NativeStackScreenProps<SettingsStackParamList, 'SignIn'>;

export function SignInScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <ScreenTemplate scroll>
      <View style={styles.headlineBlock}>
        <Text style={[styles.headline, { color: colors.onSurface }]}>Sign in</Text>
        <Text style={[styles.sub, { color: colors.onSurfaceMuted }]}>
          Welcome back — enter your details to continue.
        </Text>
      </View>

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

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.onSurfaceMuted }]}>PASSWORD</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.onSurfaceSubtle}
          style={[
            styles.input,
            { backgroundColor: colors.surfaceSunken, color: colors.onSurface, borderColor: colors.border },
          ]}
        />
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        style={[styles.submit, { backgroundColor: colors.accent }]}
      >
        <Text style={[styles.submitLabel, { color: colors.onAccent }]}>Continue</Text>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="link"
        style={styles.forgotLink}
        onPress={() => navigation.navigate('ForgotPassword')}
      >
        <Text style={{ color: colors.accentTextSafe, ...type.bodySm }}>Forgot password?</Text>
      </TouchableOpacity>
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
  submitLabel: { ...type.body, fontWeight: '600' },
  forgotLink: { minHeight: targetComfortable, alignItems: 'center', justifyContent: 'center', marginTop: space[2] },
});
