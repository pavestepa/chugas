import { StyleSheet, View } from 'react-native';

import { UserAvatar } from '@/entities/user/ui/user-avatar';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

import type { CommentCardProps } from './comment-card.types';

function formatCommentDate(isoDate: string) {
  return new Date(isoDate).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CommentCard({ comment, author }: CommentCardProps) {
  const theme = useTheme();

  return (
    <ThemedView
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.separator },
      ]}>
      <View style={styles.header}>
        <UserAvatar user={author} size={32} />
        <View style={styles.headerText}>
          <ThemedText type="chatName">@{author.username}</ThemedText>
          <ThemedText type="chatPreview" themeColor="textSecondary">
            {formatCommentDate(comment.createdAt)}
          </ThemedText>
        </View>
      </View>

      <ThemedText type="messageBody">{comment.text}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
});
