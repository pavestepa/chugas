import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatComposer } from '@/entities/chat/ui/chat-composer';
import { getPost } from '@/entities/post/api';
import { PostCard } from '@/entities/post/ui';
import type { Post, PostId } from '@/entities/post';
import { getUser } from '@/entities/user/api';
import { toUserPreview } from '@/entities/user/model/user-label';
import type { PostCardProps } from '@/entities/post/ui/post-card.types';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

import { usePostComments } from '../hooks/use-post-comments';
import { CommentThread } from './comment-thread';

type PostCommentsOverlayProps = {
  postId: PostId;
  onClose: () => void;
};

export function PostCommentsOverlay({ postId, onClose }: PostCommentsOverlayProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [post, setPost] = useState<Post | null>(null);
  const [postAuthor, setPostAuthor] = useState<PostCardProps['author'] | null>(null);
  const [isPostLoading, setIsPostLoading] = useState(true);
  const { comments, authors, isLoading, isSubmitting, error, submitComment } =
    usePostComments(postId);

  useEffect(() => {
    void (async () => {
      try {
        const loadedPost = await getPost(postId);
        const author = await getUser(loadedPost.authorId);

        setPost(loadedPost);
        setPostAuthor(toUserPreview(author));
      } catch {
        setPost(null);
        setPostAuthor(null);
      } finally {
        setIsPostLoading(false);
      }
    })();
  }, [postId]);

  if (isPostLoading || isLoading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator color={theme.accent} />
      </ThemedView>
    );
  }

  if (!post || !postAuthor) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.header, { borderBottomColor: theme.separator, paddingTop: insets.top }]}>
          <Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="linkPrimary" style={styles.backChevron}>
              ‹
            </ThemedText>
          </Pressable>
        </View>
        <ThemedText themeColor="textSecondary" style={styles.emptyState}>
          Пост не найден
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            backgroundColor: theme.headerBackground,
            borderBottomColor: theme.separator,
          },
        ]}>
        <Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="linkPrimary" style={styles.backChevron}>
            ‹
          </ThemedText>
        </Pressable>
        <ThemedText type="headerTitle">Комментарии</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <PostCard post={post} author={postAuthor} />

        <ThemedText type="chatName" style={styles.sectionTitle}>
          {comments.length} комментариев
        </ThemedText>

        {comments.length > 0 ? (
          <CommentThread comments={comments} authors={authors} />
        ) : (
          <ThemedText themeColor="textSecondary">Пока нет комментариев</ThemedText>
        )}
      </ScrollView>

      {error ? (
        <ThemedText type="small" themeColor="error" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}

      <View style={{ paddingBottom: insets.bottom }}>
        <ChatComposer
          value={draft}
          onChangeText={setDraft}
          isSending={isSubmitting}
          placeholder="Комментарий"
          onSend={() => void submitComment(draft).then(() => setDraft(''))}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  backChevron: {
    fontSize: 32,
    lineHeight: 34,
    width: 44,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  sectionTitle: {
    marginTop: Spacing.one,
  },
  error: {
    paddingHorizontal: Spacing.four,
  },
  emptyState: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
