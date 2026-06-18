import { Pressable, StyleSheet } from 'react-native';

import { useSession } from './session-provider';
import { GroupedSection } from '@/shared/components/grouped-section';
import { ThemedText } from '@/shared/components/themed-text';
import { Spacing } from '@/shared/constants/theme';

type SignOutButtonProps = {
  label?: string;
};

export function SignOutButton({ label = 'Выйти из аккаунта' }: SignOutButtonProps) {
  const { signOut } = useSession();

  return (
    <GroupedSection>
      <Pressable
        onPress={() => void signOut()}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <ThemedText type="default" themeColor="error">
          {label}
        </ThemedText>
      </Pressable>
    </GroupedSection>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
