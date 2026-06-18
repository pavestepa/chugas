import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhoneSignInForm, useSession } from '@/entities/signin/ui';
import { AnimatedIcon } from '@/shared/components/animated-icon';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/shared/constants/theme';

export default function SignInScreen() {
  const { signIn } = useSession();
  const { registered } = useLocalSearchParams<{ registered?: string }>();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showRegisteredMessage = registered === '1';

  const handleSignIn = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError('Введите email/username и пароль');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await signIn({ identifier: identifier.trim(), password });
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Не удалось войти');
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
            Войдите, чтобы продолжить
          </ThemedText>
        </ThemedView>

        <PhoneSignInForm
          identifier={identifier}
          password={password}
          isSubmitting={isSubmitting}
          onChangeIdentifier={setIdentifier}
          onChangePassword={setPassword}
          onSubmit={() => void handleSignIn()}
          error={error}
        />

        {showRegisteredMessage ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.successMessage}>
            Аккаунт создан. Войдите с вашими данными.
          </ThemedText>
        ) : null}

        <Link href="/register" asChild>
          <Pressable style={styles.linkButton}>
            <ThemedText type="linkPrimary">Создать аккаунт</ThemedText>
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
  successMessage: {
    textAlign: 'center',
  },
  linkButton: {
    paddingVertical: Spacing.two,
  },
});
