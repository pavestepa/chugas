import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { GroupedSection } from '@/shared/components/grouped-section';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

import { updateCurrentUser } from '../api';
import type { AccountType, User } from '../model';
import { validateUsername } from '../model';
import { UserAvatarPhotoButton } from './user-avatar-photo-button';

type EditProfileFormProps = {
  user: User;
  onSaved: (user: User) => void;
};

export function EditProfileForm({ user, onSaved }: EditProfileFormProps) {
  const theme = useTheme();
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio);
  const [accountType, setAccountType] = useState<AccountType>(user.accountType);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    const usernameError = validateUsername(username);

    if (usernameError) {
      setError(usernameError);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const updatedUser = await updateCurrentUser({
        username: username.trim(),
        bio: bio.trim(),
        accountType,
      });
      onSaved(updatedUser);
    } catch {
      setError('Не удалось сохранить изменения');
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <UserAvatarPhotoButton />

      <GroupedSection>
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Никнейм
          </ThemedText>
          <TextInput
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text }]}
          />
          <ThemedText type="small" themeColor="textSecondary">
            Только буквы, цифры и _
          </ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.separator }]} />
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Био
          </ThemedText>
          <TextInput
            multiline
            value={bio}
            onChangeText={setBio}
            placeholder="О себе"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, styles.multiline, { color: theme.text }]}
          />
        </View>
      </GroupedSection>

      <GroupedSection>
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Тип аккаунта
          </ThemedText>
          <View style={styles.accountTypeRow}>
            {(['open', 'closed'] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => setAccountType(value)}
                style={[
                  styles.accountTypeButton,
                  {
                    borderColor: theme.separator,
                    backgroundColor:
                      accountType === value ? theme.backgroundSelected : 'transparent',
                  },
                ]}>
                <ThemedText type="small">
                  {value === 'open' ? 'Открытый' : 'Закрытый'}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      </GroupedSection>

      {error ? (
        <ThemedText type="small" themeColor="error">
          {error}
        </ThemedText>
      ) : null}

      <Pressable
        disabled={isSubmitting}
        onPress={() => void handleSave()}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: theme.accent,
            opacity: pressed || isSubmitting ? 0.85 : 1,
          },
        ]}>
        <ThemedText style={styles.buttonText}>
          {isSubmitting ? 'Сохранение...' : 'Изменить'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
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
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  accountTypeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  accountTypeButton: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  button: {
    borderRadius: 12,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 17,
  },
});
