import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

type GroupedSectionProps = ViewProps;

export function GroupedSection({ style, children, ...rest }: GroupedSectionProps) {
  const theme = useTheme();

  return (
    <View
      style={[styles.section, { backgroundColor: theme.backgroundElement }, style]}
      {...rest}>
      {children}
    </View>
  );
}

type GroupedSeparatorProps = {
  inset?: number;
};

export function GroupedSeparator({ inset = Spacing.four }: GroupedSeparatorProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.separator,
        { backgroundColor: theme.separator, marginLeft: inset },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});
