import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/shared/components/themed-text';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

type ScreenHeaderProps = ViewProps & {
  title: string;
  subtitle?: string;
};

export function ScreenHeader({ title, subtitle, style, ...rest }: ScreenHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Platform.OS === 'ios' ? insets.top + Spacing.two : Spacing.four,
          borderBottomColor: theme.separator,
          backgroundColor: theme.background,
        },
        style,
      ]}
      {...rest}>
      <ThemedText type="screenTitle">{title}</ThemedText>
      {subtitle ? (
        <ThemedText type="small" themeColor="textSecondary">
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
  },
});
