import { ActivityIndicator, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePosts } from '@/entities/post/hooks/use-posts';
import { PostCard } from '@/entities/post/ui';
import { ScreenHeader } from '@/shared/components/screen-header';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

export default function HomeScreen() {
  const theme = useTheme();
  const { posts, authors, isLoading, isRefreshing, error, refresh } = usePosts();

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.accent} />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText themeColor="textSecondary">{error}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScreenHeader title="Chugas" />
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void refresh()}
              tintColor={theme.accent}
            />
          }
          renderItem={({ item }) => {
            const author = authors[item.authorId];

            if (!author) {
              return null;
            }

            return (
              <PostCard
                post={item}
                author={author}
                onCommentsPress={() => router.push(`/post/${item.id}`)}
              />
            );
          }}
          ItemSeparatorComponent={() => <ThemedView style={styles.separator} />}
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
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
    gap: Spacing.two,
  },
  separator: {
    height: Spacing.two,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
