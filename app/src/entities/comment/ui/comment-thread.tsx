import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/shared/constants/theme';

import type { Comment } from '../model';
import type { CommentAuthor } from '../hooks/use-post-comments';
import { CommentCard } from './comment-card';

type CommentThreadProps = {
  comments: Comment[];
  authors: Record<string, CommentAuthor>;
};

export function CommentThread({ comments, authors }: CommentThreadProps) {
  return (
    <View style={styles.thread}>
      {comments.map((comment) => {
        const author = authors[comment.authorId];

        if (!author) {
          return null;
        }

        return <CommentCard key={comment.id} comment={comment} author={author} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  thread: {
    gap: Spacing.three,
  },
});
