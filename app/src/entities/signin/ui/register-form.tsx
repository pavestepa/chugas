import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { GroupedSection } from '@/shared/components/grouped-section';
import { ThemedText } from '@/shared/components/themed-text';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

type RegisterFormProps = {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  isSubmitting?: boolean;
  onChangeEmail: (value: string) => void;
  onChangeUsername: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onSubmit: () => void;
  error?: string | null;
};

function FormField({
  label,
  value,
  onChangeText,
  ...inputProps
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
} & ComponentProps<typeof TextInput>) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text }]}
        {...inputProps}
      />
    </View>
  );
}

export function RegisterForm({
  email,
  username,
  password,
  confirmPassword,
  isSubmitting = false,
  onChangeEmail,
  onChangeUsername,
  onChangePassword,
  onChangeConfirmPassword,
  onSubmit,
  error,
}: RegisterFormProps) {
  const theme = useTheme();
  const canSubmit =
    Boolean(
      email.trim() && username.trim() && password.trim() && confirmPassword.trim(),
    ) && !isSubmitting;

  return (
    <View style={styles.wrapper}>
      <GroupedSection>
        <FormField
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          value={email}
          onChangeText={onChangeEmail}
        />
        <View style={[styles.divider, { backgroundColor: theme.separator }]} />
        <FormField
          label="Username"
          autoCapitalize="none"
          placeholder="username"
          value={username}
          onChangeText={onChangeUsername}
        />
        <View style={[styles.divider, { backgroundColor: theme.separator }]} />
        <FormField
          label="Пароль"
          autoCapitalize="none"
          placeholder="password"
          secureTextEntry
          value={password}
          onChangeText={onChangePassword}
        />
        <View style={[styles.divider, { backgroundColor: theme.separator }]} />
        <FormField
          label="Подтвердите пароль"
          autoCapitalize="none"
          placeholder="password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={onChangeConfirmPassword}
        />
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
        <ThemedText style={styles.buttonText}>
          {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
        </ThemedText>
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
