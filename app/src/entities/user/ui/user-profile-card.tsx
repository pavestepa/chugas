import { StyleSheet, View } from 'react-native';

import { GroupedSection } from '@/shared/components/grouped-section';
import { Spacing } from '@/shared/constants/theme';

import type { User } from '../model';
import { UserAvatar } from './user-avatar';
import { UserProfileField } from './user-profile-field';

type UserProfileCardProps = {
  user: User;
};

export function UserProfileCard({ user }: UserProfileCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.avatarWrap}>
        <UserAvatar user={user} size={88} />
      </View>

      <GroupedSection>
        <UserProfileField label="Email" value={user.email} accessibilityLabel="Email" />
        <UserProfileField
          label="Никнейм"
          value={`@${user.username}`}
          accessibilityLabel="Редактировать никнейм"
        />
        <UserProfileField
          label="Подписчики"
          value={String(user.followersCount)}
          accessibilityLabel="Количество подписчиков"
        />
        <UserProfileField
          label="Подписки"
          value={String(user.followingCount)}
          accessibilityLabel="Количество подписок"
        />
        <UserProfileField
          label="Тип аккаунта"
          value={user.accountType === 'closed' ? 'Закрытый' : 'Открытый'}
          accessibilityLabel="Тип аккаунта"
        />
        <UserProfileField
          label="Био"
          value={user.bio}
          accessibilityLabel="Редактировать био"
          showSeparator={false}
        />
      </GroupedSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.five,
    alignItems: 'stretch',
  },
  avatarWrap: {
    alignItems: 'center',
  },
});
