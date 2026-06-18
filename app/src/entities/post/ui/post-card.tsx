import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { UserAvatar } from '@/entities/user/ui/user-avatar';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

import { formatPostTypeLabel, getPrimaryMediaUrl } from '../model/types';
import type { PostCardProps } from './post-card.types';

function formatPostDate(isoDate: string) {
  return new Date(isoDate).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatExpiresIn(isoDate: string) {
  const secondsLeft = Math.max(0, Math.floor((new Date(isoDate).getTime() - Date.now()) / 1000));

  if (secondsLeft <= 0) {
    return 'истекает';
  }

  const minutes = Math.floor(secondsLeft / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours} ч`;
  }

  return `${minutes} мин`;
}

export function PostCard({ post, author, onCommentsPress }: PostCardProps) {
  const theme = useTheme();
  const imageUrl = getPrimaryMediaUrl(post);

  return (
    <ThemedView
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.separator },
      ]}>
      <View style={styles.header}>
        <UserAvatar user={author} size={40} />
        <View style={styles.headerText}>
          <ThemedText type="chatName">@{author.username}</ThemedText>
          <ThemedText type="chatPreview" themeColor="textSecondary">
            {formatPostTypeLabel(post.type)} · {formatPostDate(post.createdAt)} ·{' '}
            {formatExpiresIn(post.expiresAt)}
          </ThemedText>
        </View>
      </View>

      <ThemedText type="messageBody">{post.text}</ThemedText>

      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
      ) : null}

      <View style={[styles.footer, { borderTopColor: theme.separator }]}>
        <Pressable
          disabled={!onCommentsPress}
          onPress={onCommentsPress}
          style={({ pressed }) => pressed && onCommentsPress && styles.pressed}>
          <ThemedText type="linkPrimary">Комментарии</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 10,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
