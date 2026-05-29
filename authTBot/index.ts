const apiUrl = process.env.API_URL ?? "http://localhost:3000";
const botSecret = process.env.AUTH_BOT_SECRET ?? "change-me-bot-secret";
const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

const { Bot } = await import("grammy");

const bot = new Bot(botToken);
const waitingChats = new Set<number>();

bot.command("start", async (ctx) => {
  waitingChats.add(ctx.chat.id);
  await ctx.reply(
    "Привет! Я бот авторизации irlgram.\n\n" +
      "Отправь мне 6-значный код из приложения, чтобы завершить вход.\n\n" +
      "Если кода нет, сначала начни регистрацию или вход в приложении."
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "Как войти:\n\n" +
      "1. Открой приложение irlgram.\n" +
      "2. Начни регистрацию или вход по username.\n" +
      "3. Скопируй 6-значный код.\n" +
      "4. Отправь код сюда в чат."
  );
});

bot.on("message:text", async (ctx) => {
  if (!waitingChats.has(ctx.chat.id)) {
    await ctx.reply("Send /start first, then enter your code from the app.");
    return;
  }

  const code = ctx.message.text.trim();
  if (!/^\d{6}$/.test(code)) {
    await ctx.reply("Code must be 6 digits. Try again.");
    return;
  }

  const response = await fetch(`${apiUrl}/auth/telegram/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Bot-Secret": botSecret,
    },
    body: JSON.stringify({
      code,
      telegramId: String(ctx.from.id),
      telegramUsername: ctx.from.username ?? "",
    }),
  });

  if (response.status === 401) {
    await ctx.reply("Invalid or expired code. Request a new one in the app.");
    return;
  }

  if (!response.ok) {
    const error = (await response.json()) as { error?: string };
    await ctx.reply(error.error ?? "Authentication failed. Try again.");
    return;
  }

  const data = (await response.json()) as { username?: string };
  waitingChats.delete(ctx.chat.id);
  await ctx.reply(
    `Success! You're signed in as @${data.username ?? "user"}.\nReturn to the app — tokens are ready.`
  );
});

console.log("🤖 authTBot is running");
await bot.start();
