import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'link'
    | 'linkPrimary'
    | 'code'
    | 'screenTitle'
    | 'chatName'
    | 'chatPreview'
    | 'chatTime'
    | 'messageBody'
    | 'messageTime'
    | 'headerTitle';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && [styles.linkPrimary, { color: theme.linkPrimary }],
        type === 'code' && styles.code,
        type === 'screenTitle' && styles.screenTitle,
        type === 'chatName' && styles.chatName,
        type === 'chatPreview' && styles.chatPreview,
        type === 'chatTime' && styles.chatTime,
        type === 'messageBody' && styles.messageBody,
        type === 'messageTime' && styles.messageTime,
        type === 'headerTitle' && styles.headerTitle,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '400',
  },
  small: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
  },
  smallBold: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  title: {
    fontFamily: Fonts.accent,
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 41,
    letterSpacing: 0.37,
  },
  subtitle: {
    fontFamily: Fonts.accent,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  screenTitle: {
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 41,
    letterSpacing: 0.37,
  },
  chatName: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  chatPreview: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
  },
  chatTime: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '400',
  },
  messageBody: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '400',
  },
  messageTime: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  link: {
    lineHeight: 22,
    fontSize: 17,
  },
  linkPrimary: {
    lineHeight: 22,
    fontSize: 17,
    fontWeight: '400',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: 12,
  },
});
