import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { getUserInitials } from '@/entities/user/model/user-label';
import { ThemedText } from '@/shared/components/themed-text';
import { useTheme } from '@/shared/hooks/use-theme';

import type { User } from '../model';

type UserAvatarProps = {
  user: Pick<User, 'username' | 'avatarUrl'>;
  size?: number;
};

export function UserAvatar({ user, size = 96 }: UserAvatarProps) {
  const theme = useTheme();
  const initialsSize = Math.max(14, Math.round(size * 0.36));

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.accent,
        },
      ]}>
      {user.avatarUrl ? (
        <Image source={{ uri: user.avatarUrl }} style={styles.image} />
      ) : (
        <ThemedText
          style={[styles.initials, { fontSize: initialsSize, lineHeight: initialsSize + 2, color: '#FFFFFF' }]}>
          {getUserInitials(user)}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    fontWeight: '600',
  },
});
