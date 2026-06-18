import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class LocationDto {
  @ApiProperty({ minimum: -180, maximum: 180 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiProperty({ minimum: -90, maximum: 90 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;
}

export class CreatePostDto {
  @ApiProperty({ enum: ['public', 'followers', 'community'] })
  @IsIn(['public', 'followers', 'community'])
  type!: 'public' | 'followers' | 'community';

  @ApiProperty({ minLength: 1, maxLength: 5000 })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  text!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  media?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  communityId?: string;

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  location!: LocationDto;
}

export class PostLocationQueryDto extends LocationDto {}

export type PostType = 'public' | 'followers' | 'community';
export type PostVisibility = 'public' | 'followers' | 'community';

export interface GeoPointDto {
  type: 'Point';
  coordinates: number[];
}

export interface MapPoint {
  postId: string;
  type: PostType;
  visibility: PostVisibility;
  communityId?: string;
  authorId: string;
  location?: GeoPointDto | null;
  expiresAt: Date;
  secondsLeft: number;
}

export interface ReadablePost {
  _id: string;
  authorId: string;
  type: PostType;
  visibility: PostVisibility;
  communityId?: string | null;
  text: string;
  media: string[];
  location?: GeoPointDto | null;
  createdAt: Date;
  expiresAt: Date;
}

export class MapPostsQueryDto {
  @ApiPropertyOptional({ enum: ['public', 'followers', 'community'] })
  @IsOptional()
  @IsIn(['public', 'followers', 'community'])
  type?: PostType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  communityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  followingId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  minLng?: number;

  @ApiPropertyOptional({ minimum: -90, maximum: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  minLat?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  maxLng?: number;

  @ApiPropertyOptional({ minimum: -90, maximum: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  maxLat?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({ minimum: -90, maximum: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100_000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100_000)
  radiusMeters?: number;
}

export class NearbyPostsQueryDto {
  @ApiProperty({ minimum: -180, maximum: 180 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiProperty({ minimum: -90, maximum: 90 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiPropertyOptional({ enum: ['public', 'followers', 'community'] })
  @IsOptional()
  @IsIn(['public', 'followers', 'community'])
  type?: PostType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  communityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  followingId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class CommunityPostsQueryDto extends LocationDto {}
