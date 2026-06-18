import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { GroupedSection } from '@/shared/components/grouped-section';
import { ThemedText } from '@/shared/components/themed-text';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

type PhoneSignInFormProps = {
  identifier: string;
  password: string;
  isSubmitting?: boolean;
  onChangeIdentifier: (value: string) => void;
  onChangePassword: (value: string) => void;
  onSubmit: () => void;
  error?: string | null;
};

export function PhoneSignInForm({
  identifier,
  password,
  isSubmitting = false,
  onChangeIdentifier,
  onChangePassword,
  onSubmit,
  error,
}: PhoneSignInFormProps) {
  const theme = useTheme();
  const canSubmit = Boolean(identifier.trim() && password.trim()) && !isSubmitting;

  return (
    <View style={styles.wrapper}>
      <GroupedSection>
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Email или username
          </ThemedText>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text }]}
            value={identifier}
            onChangeText={onChangeIdentifier}
          />
        </View>
        <View style={[styles.divider, { backgroundColor: theme.separator }]} />
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Пароль
          </ThemedText>
          <TextInput
            autoCapitalize="none"
            placeholder="password"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            style={[styles.input, { color: theme.text }]}
            value={password}
            onChangeText={onChangePassword}
          />
        </View>
      </GroupedSection>

      {error ? (
        <ThemedText type="small" themeColor="error" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}

      <Pressable
        disabled={!canSubmit}
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: canSubmit ? theme.accent : theme.backgroundSelected,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <ThemedText style={styles.buttonText}>{isSubmitting ? 'Вход...' : 'Войти'}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.four,
  },
  input: {
    fontSize: 17,
    lineHeight: 22,
    paddingVertical: Spacing.one,
  },
  error: {
    textAlign: 'center',
  },
  button: {
    borderRadius: 12,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
