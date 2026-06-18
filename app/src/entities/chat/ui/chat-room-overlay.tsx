import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

import type { ChatId } from '../model';
import { useChatRoom } from '../hooks/use-chat-room';
import { ChatComposer } from './chat-composer';
import { ChatHeader } from './chat-header';
import { MessageBubble } from './message-bubble';

type ChatRoomOverlayProps = {
  chatId: ChatId;
  peerName: string;
  peerAvatarUrl?: string;
  onClose: () => void;
};

function formatMessageTime(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ChatRoomOverlay({
  chatId,
  peerName,
  peerAvatarUrl = '',
  onClose,
}: ChatRoomOverlayProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const { messages, currentUserId, isLoading, isSending, isConnected, error, sendMessage } =
    useChatRoom(chatId);

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator color={theme.accent} />
      </ThemedView>
    );
  }

  const peer = { username: peerName, avatarUrl: peerAvatarUrl };

  return (
    <ThemedView style={styles.container}>
      <View style={{ paddingTop: insets.top, backgroundColor: theme.headerBackground }}>
        <ChatHeader
          peer={peer}
          subtitle={isConnected ? 'в сети' : 'подключение...'}
          onBack={onClose}
        />
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        style={{ backgroundColor: theme.chatWallpaper }}
        contentContainerStyle={styles.messages}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageRow,
              item.senderId === currentUserId ? styles.messageRowMine : styles.messageRowPeer,
            ]}>
            <MessageBubble
              text={item.text}
              time={formatMessageTime(item.createdAt)}
              isMine={item.senderId === currentUserId}
            />
          </View>
        )}
      />

      {error ? (
        <ThemedText type="small" themeColor="error" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}

      <View style={{ paddingBottom: insets.bottom }}>
        <ChatComposer
          value={draft}
          onChangeText={setDraft}
          isSending={isSending}
          onSend={() => void sendMessage(draft).then(() => setDraft(''))}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messages: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 4,
  },
  messageRow: {
    width: '100%',
    marginVertical: 2,
  },
  messageRowMine: {
    alignItems: 'flex-end',
  },
  messageRowPeer: {
    alignItems: 'flex-start',
  },
  error: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.one,
  },
});
