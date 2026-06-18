import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCurrentUser } from '@/entities/user/hooks/use-current-user';
import { EditProfileForm } from '@/entities/user/ui';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

export default function ProfileEditScreen() {
  const theme = useTheme();
  const { user, isLoading, setUser } = useCurrentUser();

  if (isLoading || !user) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.accent} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { borderBottomColor: theme.separator }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="linkPrimary">Отмена</ThemedText>
          </Pressable>
          <ThemedText type="headerTitle">Редактирование</ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <EditProfileForm
          user={user}
          onSaved={(updatedUser) => {
            setUser(updatedUser);
            router.back();
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSpacer: {
    width: 64,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
