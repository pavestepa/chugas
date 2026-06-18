import { Pressable, StyleSheet, View } from 'react-native';

import { UserAvatar } from '@/entities/user/ui/user-avatar';
import type { UserPreview } from '@/entities/user';
import { ThemedText } from '@/shared/components/themed-text';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

type ChatHeaderProps = {
  peer: Pick<UserPreview, 'username' | 'avatarUrl'>;
  subtitle?: string;
  onBack: () => void;
};

export function ChatHeader({ peer, subtitle, onBack }: ChatHeaderProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.headerBackground, borderBottomColor: theme.separator },
      ]}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
        <ThemedText type="linkPrimary" style={styles.backChevron}>
          ‹
        </ThemedText>
      </Pressable>

      <View style={styles.center}>
        <ThemedText type="headerTitle" numberOfLines={1}>
          {peer.username}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.avatarWrap}>
        <UserAvatar user={peer} size={34} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChevron: {
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '400',
    marginTop: -2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
    paddingHorizontal: Spacing.two,
  },
  avatarWrap: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
