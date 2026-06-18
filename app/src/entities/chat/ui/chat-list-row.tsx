import { Pressable, StyleSheet, View } from 'react-native';

import { UserAvatar } from '@/entities/user/ui/user-avatar';
import { ThemedText } from '@/shared/components/themed-text';
import { ChatListRow, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

import type { ChatListItem } from '../store/chats-store';

type ChatListRowProps = {
  item: ChatListItem;
  onPress: () => void;
};

function formatListTime(isoDate: string) {
  const date = new Date(isoDate);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  const isThisWeek = now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000;

  if (isThisWeek) {
    return date.toLocaleDateString('ru-RU', { weekday: 'short' });
  }

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function ChatListRowItem({ item, onPress }: ChatListRowProps) {
  const theme = useTheme();
  const { chat, peer } = item;
  const preview = chat.lastMessage?.text ?? 'Нет сообщений';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.backgroundElement : theme.chatBackground },
      ]}>
      <UserAvatar user={peer} size={ChatListRow.avatarSize} />

      <View style={styles.content}>
        <View style={styles.topLine}>
          <ThemedText type="chatName" numberOfLines={1} style={styles.name}>
            {peer.username}
          </ThemedText>
          <ThemedText type="chatTime" themeColor="textSecondary">
            {formatListTime(chat.lastMessageAt)}
          </ThemedText>
        </View>
        <ThemedText type="chatPreview" themeColor="textSecondary" numberOfLines={2}>
          {preview}
        </ThemedText>
      </View>

      <View style={[styles.separator, { backgroundColor: theme.separator }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: ChatListRow.horizontalPadding,
    paddingRight: ChatListRow.horizontalPadding,
    paddingVertical: Spacing.two,
    minHeight: ChatListRow.height,
    gap: Spacing.three,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
    paddingRight: Spacing.one,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
  },
  separator: {
    position: 'absolute',
    left: ChatListRow.separatorInset,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
});
