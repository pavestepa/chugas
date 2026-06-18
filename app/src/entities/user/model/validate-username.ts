const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export function validateUsername(username: string): string | null {
  const trimmed = username.trim();

  if (!trimmed) {
    return 'Никнейм не может быть пустым';
  }

  if (!USERNAME_REGEX.test(trimmed)) {
    return 'Никнейм может содержать только буквы, цифры и _';
  }

  return null;
}
