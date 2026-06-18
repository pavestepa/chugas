import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { register } from '@/entities/signin/api/register';
import { RegisterForm } from '@/entities/signin/ui/register-form';
import { AnimatedIcon } from '@/shared/components/animated-icon';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/shared/constants/theme';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

function validateRegistration(input: {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}): string | null {
  if (!input.email.trim() || !input.username.trim() || !input.password.trim()) {
    return 'Заполните все поля';
  }

  if (input.username.length < 3 || input.username.length > 32) {
    return 'Username должен быть от 3 до 32 символов';
  }

  if (!USERNAME_PATTERN.test(input.username)) {
    return 'Username может содержать только буквы, цифры и _';
  }

  if (input.password.length < 8 || input.password.length > 128) {
    return 'Пароль должен быть от 8 до 128 символов';
  }

  if (input.password !== input.confirmPassword) {
    return 'Пароли не совпадают';
  }

  return null;
}

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    const validationError = validateRegistration({
      email,
      username,
      password,
      confirmPassword,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await register({
        email: email.trim(),
        username: username.trim(),
        password,
      });
      router.replace('/sign-in?registered=1');
    } catch (registerError) {
      setError(
        registerError instanceof Error ? registerError.message : 'Не удалось зарегистрироваться',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <AnimatedIcon />
          <ThemedText type="screenTitle" style={styles.title}>
            Chugas
          </ThemedText>
          <ThemedText type="chatPreview" themeColor="textSecondary" style={styles.subtitle}>
            Создайте аккаунт
          </ThemedText>
        </ThemedView>

        <RegisterForm
          email={email}
          username={username}
          password={password}
          confirmPassword={confirmPassword}
          isSubmitting={isSubmitting}
          onChangeEmail={setEmail}
          onChangeUsername={setUsername}
          onChangePassword={setPassword}
          onChangeConfirmPassword={setConfirmPassword}
          onSubmit={() => void handleRegister()}
          error={error}
        />

        <Link href="/sign-in" asChild>
          <Pressable style={styles.linkButton}>
            <ThemedText type="linkPrimary">Уже есть аккаунт? Войти</ThemedText>
          </Pressable>
        </Link>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  linkButton: {
    paddingVertical: Spacing.two,
  },
});
