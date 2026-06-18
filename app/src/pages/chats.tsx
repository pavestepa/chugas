import { router } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatListRowItem } from '@/entities/chat/ui/chat-list-row';
import { useChats } from '@/entities/chat/hooks/use-chats';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { BottomTabInset, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

export default function ChatsScreen() {
  const theme = useTheme();
  const { items, isLoading, isRefreshing, error, refresh } = useChats();

  if (isLoading) {
    return (
      <ThemedView type="chatBackground" style={styles.centered}>
        <ActivityIndicator color={theme.accent} />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView type="chatBackground" style={styles.centered}>
        <ThemedText themeColor="textSecondary">{error}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView type="chatBackground" style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: theme.separator }]}>
          <ThemedText type="screenTitle">Чаты</ThemedText>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.chat.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void refresh()}
              tintColor={theme.accent}
            />
          }
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              Нет чатов
            </ThemedText>
          }
          renderItem={({ item }) => (
            <ChatListRowItem
              item={item}
              onPress={() =>
                router.push({
                  pathname: '/chat/[id]',
                  params: {
                    id: item.chat.id,
                    peerName: item.peer.username,
                    peerAvatarUrl: item.peer.avatarUrl ?? '',
                  },
                })
              }
            />
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listContent: {
    paddingBottom: BottomTabInset + Spacing.two,
  },
  empty: {
    textAlign: 'center',
    paddingTop: Spacing.seven,
    fontSize: 17,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
