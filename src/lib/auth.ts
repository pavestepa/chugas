export function getUserId(userId: string | null): string {
  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}
