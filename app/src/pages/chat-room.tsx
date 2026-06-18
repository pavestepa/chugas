import { router, useLocalSearchParams } from 'expo-router';

import { ChatRoomOverlay } from '@/entities/chat/ui';
import type { ChatId } from '@/entities/chat/model';

export default function ChatRoomScreen() {
  const { id, peerName, peerAvatarUrl } = useLocalSearchParams<{
    id: string;
    peerName?: string;
    peerAvatarUrl?: string;
  }>();

  if (!id) {
    router.back();
    return null;
  }

  return (
    <ChatRoomOverlay
      chatId={id as ChatId}
      peerName={peerName ?? 'Чат'}
      peerAvatarUrl={peerAvatarUrl ?? ''}
      onClose={() => router.back()}
    />
  );
}
