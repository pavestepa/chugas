import { hash } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_USER_EMAIL ?? 'pavel@example.com';
  const username = process.env.SEED_USER_USERNAME ?? 'pavel';
  const password = process.env.SEED_USER_PASSWORD ?? 'password123';
  const bio = process.env.SEED_USER_BIO ?? 'Default seeded user';

  const passwordHash = await hash(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: { username, passwordHash, bio },
    create: { email, username, passwordHash, bio },
  });

  console.log(`Seeded user: ${user.username} (${user.email})`);
}

main()
  // eslint-disable-next-line @typescript-eslint/use-unknown-in-catch-callback-variable
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
