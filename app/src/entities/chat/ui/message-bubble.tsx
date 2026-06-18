import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/components/themed-text';
import { BubbleRadius, ThemeColor } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

type MessageBubbleProps = {
  text: string;
  time: string;
  isMine: boolean;
};

export function MessageBubble({ text, time, isMine }: MessageBubbleProps) {
  const theme = useTheme();

  const backgroundColor = isMine ? theme.bubbleOutgoing : theme.bubbleIncoming;
  const textColor: ThemeColor = isMine ? 'bubbleOutgoingText' : 'bubbleIncomingText';

  return (
    <View
      style={[
        styles.bubble,
        { backgroundColor },
        isMine ? styles.bubbleMine : styles.bubblePeer,
      ]}>
      <ThemedText type="messageBody" themeColor={textColor}>
        {text}
      </ThemedText>
      <View style={styles.metaRow}>
        <ThemedText type="messageTime" themeColor={textColor} style={styles.time}>
          {time}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  bubbleMine: {
    borderTopLeftRadius: BubbleRadius.large,
    borderTopRightRadius: BubbleRadius.large,
    borderBottomLeftRadius: BubbleRadius.large,
    borderBottomRightRadius: BubbleRadius.small,
  },
  bubblePeer: {
    borderTopLeftRadius: BubbleRadius.large,
    borderTopRightRadius: BubbleRadius.large,
    borderBottomLeftRadius: BubbleRadius.small,
    borderBottomRightRadius: BubbleRadius.large,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  time: {
    opacity: 0.55,
  },
});
