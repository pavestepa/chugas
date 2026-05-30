import net from "node:net";
import tls from "node:tls";

interface MailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

function smtpConfig(): SmtpConfig {
  const config = {
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "chugas <no-reply@chugas.local>",
  };

  if (!config.host) {
    throw new Error("SMTP_HOST is required");
  }

  if (
    !Number.isInteger(config.port) ||
    config.port < 1 ||
    config.port > 65535
  ) {
    throw new Error("SMTP_PORT must be between 1 and 65535");
  }

  if (!config.from) {
    throw new Error("SMTP_FROM is required");
  }

  return config;
}

function encodeBase64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

function extractEmailAddress(value: string): string {
  const match = /<([^>]+)>/.exec(value);
  return match?.[1] ?? value;
}

function escapeHeader(value: string): string {
  return value.replace(/[\r\n]/g, " ").trim();
}

function messageBody(input: MailInput, config: SmtpConfig): string {
  const boundary = `chugas-${crypto.randomUUID()}`;

  if (!input.html) {
    return [
      `From: ${escapeHeader(config.from)}`,
      `To: ${escapeHeader(input.to)}`,
      `Subject: ${escapeHeader(input.subject)}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      input.text,
    ].join("\r\n");
  }

  return [
    `From: ${escapeHeader(config.from)}`,
    `To: ${escapeHeader(input.to)}`,
    `Subject: ${escapeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    input.text,
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    input.html,
    `--${boundary}--`,
  ].join("\r\n");
}

async function readLine(socket: net.Socket): Promise<string> {
  return await new Promise((resolve, reject) => {
    const onData = (chunk: Buffer) => {
      const data = chunk.toString("utf8");
      if (!data.includes("\n")) {
        return;
      }

      socket.off("data", onData);
      socket.off("error", reject);
      resolve(data);
    };

    socket.once("error", reject);
    socket.on("data", onData);
  });
}

async function command(socket: net.Socket, line: string): Promise<string> {
  socket.write(`${line}\r\n`);
  return readLine(socket);
}

function assertSmtpOk(response: string): void {
  if (!/^[23]/.test(response)) {
    throw new Error("SMTP command failed");
  }
}

async function connectSmtp(config: SmtpConfig): Promise<net.Socket> {
  const options = {
    host: config.host,
    port: config.port,
  };
  const socket = config.secure ? tls.connect(options) : net.connect(options);

  await readLine(socket);
  return socket;
}

export async function sendMail(input: MailInput): Promise<void> {
  const config = smtpConfig();
  const socket = await connectSmtp(config);

  try {
    assertSmtpOk(await command(socket, `EHLO ${config.host}`));

    if (config.user && config.pass) {
      assertSmtpOk(await command(socket, "AUTH LOGIN"));
      assertSmtpOk(await command(socket, encodeBase64(config.user)));
      assertSmtpOk(await command(socket, encodeBase64(config.pass)));
    }

    assertSmtpOk(
      await command(socket, `MAIL FROM:<${extractEmailAddress(config.from)}>`)
    );
    assertSmtpOk(await command(socket, `RCPT TO:<${input.to}>`));
    assertSmtpOk(await command(socket, "DATA"));

    socket.write(`${messageBody(input, config)}\r\n.\r\n`);
    assertSmtpOk(await readLine(socket));
    await command(socket, "QUIT");
  } finally {
    socket.end();
  }
}

export async function sendAuthCodeEmail(
  email: string,
  code: string
): Promise<void> {
  await sendMail({
    to: email,
    subject: "Your chugas verification code",
    text: `Your chugas verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your chugas verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  resetLink: string
): Promise<void> {
  await sendMail({
    to: email,
    subject: "Reset your chugas password",
    text: `Open this link to reset your chugas password: ${resetLink}\n\nThis link expires in 10 minutes. If you did not request it, ignore this email.`,
    html: `<p>Open this link to reset your chugas password:</p><p><a href="${resetLink}">Reset password</a></p><p>This link expires in 10 minutes. If you did not request it, ignore this email.</p>`,
  });
}
