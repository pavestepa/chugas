import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
  ConflictException,
  HttpException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimitService } from '../../common/services/rate-limit.service';
import { LocationService } from '../location/location.service';
import {
  EmailStartDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordConfirmDto,
  SetupPasswordDto,
  VerifyEmailDto,
  AuthIdentifierDto,
} from './dto/auth.dto';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly rateLimitService: RateLimitService,
    private readonly locationService: LocationService,
  ) {}

  private async createAccessToken(userId: string) {
    return this.jwtService.signAsync({ sub: userId });
  }

  @Public()
  @Post('email/start')
  async startEmail(@Body() body: EmailStartDto) {
    const limit = await this.rateLimitService.rateLimit({
      scope: 'auth-email-start',
      identity: body.identifier,
      limit: 5,
      windowSeconds: 60,
    });
    if (!limit.allowed) {
      throw new HttpException(
        this.rateLimitService.rateLimitedResponse(limit.resetInSeconds),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const result = await this.authService.startEmailSession(body.identifier);
    if (result.error === 'not_found') {
      throw new NotFoundException({ error: 'User not found' });
    }
    return result;
  }

  @Public()
  @Post('email/verify')
  async verifyEmail(@Body() body: VerifyEmailDto) {
    const limit = await this.rateLimitService.rateLimit({
      scope: 'auth-email-verify',
      identity: body.sessionId,
      limit: 10,
      windowSeconds: 60,
    });
    if (!limit.allowed) {
      throw new HttpException(
        this.rateLimitService.rateLimitedResponse(limit.resetInSeconds),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const result = await this.authService.verifyEmailCode(body);
    if (result.error === 'not_found') {
      throw new NotFoundException({ error: 'Session not found or expired' });
    }
    if (result.error === 'invalid_code') {
      throw new UnauthorizedException({ error: 'Invalid verification code' });
    }
    return result;
  }

  @Public()
  @Post('password/setup')
  async setupPassword(@Body() body: SetupPasswordDto) {
    const limit = await this.rateLimitService.rateLimit({
      scope: 'auth-password-setup',
      identity: body.sessionId,
      limit: 5,
      windowSeconds: 60,
    });
    if (!limit.allowed) {
      throw new HttpException(
        this.rateLimitService.rateLimitedResponse(limit.resetInSeconds),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const result = await this.authService.setupPassword(body);
    if (result.error === 'not_found') {
      throw new NotFoundException({ error: 'Session not found or expired' });
    }
    if (result.error === 'username_taken') {
      throw new ConflictException({ error: 'Username is already taken' });
    }

    const accessToken = await this.createAccessToken(result.userId);
    return {
      user: result.user,
      accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: RegisterDto) {
    const limit = await this.rateLimitService.rateLimit({
      scope: 'auth-register',
      identity: body.email,
      limit: 10,
      windowSeconds: 60,
    });
    if (!limit.allowed) {
      throw new HttpException(
        this.rateLimitService.rateLimitedResponse(limit.resetInSeconds),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const result = await this.authService.register(body);
    if (result.error === 'email_taken') {
      throw new ConflictException({ error: 'Email is already registered' });
    }
    if (result.error === 'username_taken') {
      throw new ConflictException({ error: 'Username is already taken' });
    }

    return { user: result.user };
  }

  @Public()
  @Post('login')
  async login(@Body() body: LoginDto) {
    const limit = await this.rateLimitService.rateLimit({
      scope: 'auth-password-login',
      identity: body.identifier,
      limit: 10,
      windowSeconds: 60,
    });
    if (!limit.allowed) {
      throw new HttpException(
        this.rateLimitService.rateLimitedResponse(limit.resetInSeconds),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const result = await this.authService.loginWithPassword(body);
    if (
      result.error === 'not_found' ||
      result.error === 'invalid_credentials'
    ) {
      throw new UnauthorizedException({ error: 'Invalid credentials' });
    }

    const accessToken = await this.createAccessToken(result.userId);
    return {
      user: result.user,
      accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Public()
  @Post('password/reset/request')
  async requestPasswordReset(@Body() body: AuthIdentifierDto) {
    const limit = await this.rateLimitService.rateLimit({
      scope: 'auth-password-reset-request',
      identity: body.identifier,
      limit: 5,
      windowSeconds: 60,
    });
    if (!limit.allowed) {
      throw new HttpException(
        this.rateLimitService.rateLimitedResponse(limit.resetInSeconds),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return this.authService.startPasswordReset(body.identifier);
  }

  @Public()
  @Post('password/reset/confirm')
  async confirmPasswordReset(@Body() body: ResetPasswordConfirmDto) {
    const limit = await this.rateLimitService.rateLimit({
      scope: 'auth-password-reset-confirm',
      identity: body.sessionId,
      limit: 10,
      windowSeconds: 60,
    });
    if (!limit.allowed) {
      throw new HttpException(
        this.rateLimitService.rateLimitedResponse(limit.resetInSeconds),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const result = await this.authService.resetPassword(body);
    if (result.error === 'not_found') {
      throw new NotFoundException({
        error: 'Password reset session not found or expired',
      });
    }
    if (result.error === 'invalid_code') {
      throw new UnauthorizedException({ error: 'Invalid password reset code' });
    }

    const refreshToken = await this.authService.createRefreshToken(result.userId);
    const accessToken = await this.createAccessToken(result.userId);
    return {
      user: result.user,
      accessToken,
      refreshToken,
    };
  }

  @Public()
  @Get('session/:sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    const result = await this.authService.getSessionStatus(sessionId);
    if (result.error === 'not_found') {
      throw new NotFoundException({ error: 'Session not found or expired' });
    }
    return result;
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() body: RefreshTokenDto) {
    const result = await this.authService.rotateRefreshToken(body.refreshToken);
    if (!result) {
      throw new UnauthorizedException({ error: 'Invalid refresh token' });
    }

    const accessToken = await this.createAccessToken(result.userId);
    return {
      user: result.user,
      accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Public()
  @Post('logout')
  async logout(@Body() body: LogoutDto, @CurrentUser() userId: string | null) {
    await this.authService.revokeRefreshToken(body.refreshToken);
    if (userId) {
      await this.locationService.flush(userId);
    }
    return { success: true };
  }
}
