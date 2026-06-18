/**
 * Telegram-inspired design tokens for light and dark mode.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#FFFFFF',
    backgroundElement: '#F2F2F7',
    backgroundSelected: '#E5E5EA',
    textSecondary: '#8E8E93',
    error: '#FF3B30',
    accent: '#2481CC',
    linkPrimary: '#2481CC',
    separator: '#C6C6C8',
    chatBackground: '#FFFFFF',
    chatWallpaper: '#E6EBEE',
    bubbleIncoming: '#FFFFFF',
    bubbleOutgoing: '#E1FFC7',
    bubbleIncomingText: '#000000',
    bubbleOutgoingText: '#000000',
    headerBackground: '#F7F7F7',
    composerBackground: '#F7F7F7',
    tabBarBackground: '#F7F7F7',
  },
  dark: {
    text: '#FFFFFF',
    background: '#000000',
    backgroundElement: '#1C1C1E',
    backgroundSelected: '#2C2C2E',
    textSecondary: '#8E8E93',
    error: '#FF453A',
    accent: '#64B5EF',
    linkPrimary: '#64B5EF',
    separator: '#38383A',
    chatBackground: '#000000',
    chatWallpaper: '#0E1621',
    bubbleIncoming: '#182533',
    bubbleOutgoing: '#2B5278',
    bubbleIncomingText: '#FFFFFF',
    bubbleOutgoingText: '#FFFFFF',
    headerBackground: '#1C1C1E',
    composerBackground: '#1C1C1E',
    tabBarBackground: '#1C1C1E',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
    accent: 'System',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
    accent: 'normal',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 32,
  eight: 48,
} as const;

/** Telegram chat list row height baseline */
export const ChatListRow = {
  height: 72,
  avatarSize: 54,
  horizontalPadding: 12,
  separatorInset: 68,
} as const;

/** Telegram message bubble radii */
export const BubbleRadius = {
  large: 18,
  small: 4,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
