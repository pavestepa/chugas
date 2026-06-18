import { StyleSheet, View } from 'react-native';

import { GroupedSeparator } from '@/shared/components/grouped-section';
import { ThemedText } from '@/shared/components/themed-text';
import { Spacing } from '@/shared/constants/theme';

import { EditProfileButton } from './edit-profile-button';

type UserProfileFieldProps = {
  label: string;
  value: string;
  accessibilityLabel: string;
  showSeparator?: boolean;
};

export function UserProfileField({
  label,
  value,
  accessibilityLabel,
  showSeparator = true,
}: UserProfileFieldProps) {
  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="small" themeColor="textSecondary">
            {label}
          </ThemedText>
          <EditProfileButton accessibilityLabel={accessibilityLabel} />
        </View>
        <ThemedText type="default">{value || '—'}</ThemedText>
      </View>
      {showSeparator ? <GroupedSeparator /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
