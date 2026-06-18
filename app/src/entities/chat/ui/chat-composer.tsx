import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/shared/components/themed-text';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

type ChatComposerProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isSending?: boolean;
  placeholder?: string;
};

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  isSending = false,
  placeholder = 'Сообщение',
}: ChatComposerProps) {
  const theme = useTheme();
  const canSend = Boolean(value.trim()) && !isSending;

  return (
    <View style={[styles.container, { backgroundColor: theme.composerBackground, borderTopColor: theme.separator }]}>
      <View style={[styles.inputWrap, { backgroundColor: theme.background, borderColor: theme.separator }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          multiline
          style={[styles.input, { color: theme.text }]}
        />
      </View>
      <Pressable
        disabled={!canSend}
        onPress={onSend}
        style={({ pressed }) => [
          styles.sendButton,
          {
            backgroundColor: canSend ? theme.accent : theme.backgroundSelected,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <ThemedText
          type="smallBold"
          style={{ color: canSend ? '#FFFFFF' : theme.textSecondary }}>
          ↑
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flex: 1,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    minHeight: 40,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    fontSize: 17,
    lineHeight: 22,
    paddingVertical: 6,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
