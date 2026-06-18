import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.getOrThrow<string>('smtp.host');
    const port = this.configService.getOrThrow<number>('smtp.port');
    const secure = this.configService.getOrThrow<boolean>('smtp.secure');
    const user = this.configService.getOrThrow<string>('smtp.user');
    const pass = this.configService.getOrThrow<string>('smtp.pass');

    this.from = this.configService.getOrThrow<string>('smtp.from');
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
  }

  async sendAuthCodeEmail(email: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: 'Your chugas verification code',
      text: `Your chugas verification code is ${code}. It expires in 10 minutes.`,
      html: `<p>Your chugas verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`,
    });
  }

  async sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: 'Reset your chugas password',
      text: `Open this link to reset your chugas password: ${resetLink}\n\nThis link expires in 10 minutes. If you did not request it, ignore this email.`,
      html: `<p>Open this link to reset your chugas password:</p><p><a href="${resetLink}">Reset password</a></p><p>This link expires in 10 minutes. If you did not request it, ignore this email.</p>`,
    });
  }
}
