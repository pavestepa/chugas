import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class AuthIdentifierDto {
  @ApiProperty({ minLength: 3, maxLength: 254 })
  @IsString()
  @MinLength(3)
  @MaxLength(254)
  identifier!: string;
}

export class EmailStartDto extends AuthIdentifierDto {}

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  sessionId!: string;

  @ApiProperty({ pattern: '^\\d{6}$' })
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

export class SetupPasswordDto {
  @ApiProperty()
  @IsString()
  sessionId!: string;

  @ApiProperty({ minLength: 3, maxLength: 32, pattern: '^[a-zA-Z0-9_]+$' })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class RegisterDto {
  @ApiProperty({ format: 'email', maxLength: 254 })
  @IsString()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 3, maxLength: 32, pattern: '^[a-zA-Z0-9_]+$' })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class LoginDto extends AuthIdentifierDto {
  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class ResetPasswordConfirmDto {
  @ApiProperty()
  @IsString()
  sessionId!: string;

  @ApiProperty({ minLength: 32, maxLength: 128 })
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  code!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class LogoutDto extends RefreshTokenDto {}
