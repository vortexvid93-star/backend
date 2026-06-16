import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { SWAGGER_TAGS } from '../common/swagger/constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/services/token.service';
import { CLOUDINARY_CONSTANTS } from '../cloudinary/cloudinary.constants';
import { ChallengesService } from '../challenges/challenges.service';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { ChallengesQueryDto } from './dto/challenges-query.dto';
import { ReadingQueryDto } from './dto/reading-query.dto';
import { SocialQueryDto } from './dto/social-query.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePushTokenDto } from './dto/update-push-token.dto';
import {
  ProfileActionsDocs,
  ProfileActivityDocs,
  ProfileBadgesDocs,
  ProfileBadgesSummaryDocs,
  ProfileChallengeParticipationDocs,
  ProfileChallengesDocs,
  ProfileChallengesSummaryDocs,
  ProfileCommentsDocs,
  ProfileCompletionDocs,
  ProfileControllerDocs,
  ProfileDashboardDocs,
  ProfileDeletePhotoDocs,
  ProfileGetDocs,
  ProfileRatingsDocs,
  ProfileReadingDocs,
  ProfileStatsDocs,
  ProfileStatsReadingDocs,
  ProfileStatsSocialDocs,
  ProfileUpdateDocs,
  ProfileUploadPhotoDocs,
} from './profile.controller.docs';
import { ProfileService } from './profile.service';

@ApiTags(SWAGGER_TAGS.PROFILE)
@ProfileControllerDocs()
@Controller('me')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly challengesService: ChallengesService,
  ) {}

  @Get()
  @ProfileGetDocs()
  @HttpCode(HttpStatus.OK)
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.profileService.getProfile(user.sub);
  }

  @Get('dashboard')
  @ProfileDashboardDocs()
  @HttpCode(HttpStatus.OK)
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.profileService.getDashboard(user.sub);
  }

  @Get('reading')
  @ProfileReadingDocs()
  @HttpCode(HttpStatus.OK)
  getReading(@CurrentUser() user: JwtPayload, @Query() query: ReadingQueryDto) {
    return this.profileService.getReading(user.sub, query);
  }

  @Get('activity')
  @ProfileActivityDocs()
  @HttpCode(HttpStatus.OK)
  getActivity(
    @CurrentUser() user: JwtPayload,
    @Query() query: ActivityQueryDto,
  ) {
    return this.profileService.getActivity(user.sub, query);
  }

  @Get('completion')
  @ProfileCompletionDocs()
  @HttpCode(HttpStatus.OK)
  getCompletion(@CurrentUser() user: JwtPayload) {
    return this.profileService.getCompletion(user.sub);
  }

  @Get('actions')
  @ProfileActionsDocs()
  @HttpCode(HttpStatus.OK)
  getActions(@CurrentUser() user: JwtPayload) {
    return this.profileService.getActions(user.sub);
  }

  @Patch()
  @ProfileUpdateDocs()
  @HttpCode(HttpStatus.OK)
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user.sub, dto);
  }

  @Post('photo')
  @ProfileUploadPhotoDocs()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: CLOUDINARY_CONSTANTS.MAX_FILE_SIZE_BYTES },
    }),
  )
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'Image JPEG, PNG ou WebP (taille max selon configuration serveur).',
        },
      },
    },
  })
  uploadProfilePhoto(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.profileService.uploadProfilePhoto(user.sub, file);
  }

  @Delete('photo')
  @ProfileDeletePhotoDocs()
  @HttpCode(HttpStatus.OK)
  deleteProfilePhoto(@CurrentUser() user: JwtPayload) {
    return this.profileService.deleteProfilePhoto(user.sub);
  }

  @Get('badges/summary')
  @ProfileBadgesSummaryDocs()
  @HttpCode(HttpStatus.OK)
  getBadgesSummary(@CurrentUser() user: JwtPayload) {
    return this.profileService.getBadgesSummary(user.sub);
  }

  @Get('badges')
  @ProfileBadgesDocs()
  @HttpCode(HttpStatus.OK)
  getBadges(@CurrentUser() user: JwtPayload) {
    return this.profileService.getBadges(user.sub);
  }

  @Get('challenges/summary')
  @ProfileChallengesSummaryDocs()
  @HttpCode(HttpStatus.OK)
  getChallengesSummary(@CurrentUser() user: JwtPayload) {
    return this.profileService.getChallengesSummary(user.sub);
  }

  @Get('challenges/:defiId')
  @ProfileChallengeParticipationDocs()
  @HttpCode(HttpStatus.OK)
  getChallengeParticipation(
    @CurrentUser() user: JwtPayload,
    @Param('defiId', ParseUUIDPipe) defiId: string,
  ) {
    return this.challengesService.getMyParticipation(user.sub, defiId);
  }

  @Get('challenges')
  @ProfileChallengesDocs()
  @HttpCode(HttpStatus.OK)
  getChallenges(
    @CurrentUser() user: JwtPayload,
    @Query() query: ChallengesQueryDto,
  ) {
    return this.profileService.getChallenges(user.sub, query);
  }

  @Get('stats/reading')
  @ProfileStatsReadingDocs()
  @HttpCode(HttpStatus.OK)
  getStatsReading(@CurrentUser() user: JwtPayload) {
    return this.profileService.getStatsReading(user.sub);
  }

  @Get('stats/social')
  @ProfileStatsSocialDocs()
  @HttpCode(HttpStatus.OK)
  getStatsSocial(@CurrentUser() user: JwtPayload) {
    return this.profileService.getStatsSocial(user.sub);
  }

  @Get('stats')
  @ProfileStatsDocs()
  @HttpCode(HttpStatus.OK)
  getStats(@CurrentUser() user: JwtPayload) {
    return this.profileService.getStats(user.sub);
  }

  @Get('comments')
  @ProfileCommentsDocs()
  @HttpCode(HttpStatus.OK)
  getMyComments(
    @CurrentUser() user: JwtPayload,
    @Query() query: SocialQueryDto,
  ) {
    return this.profileService.getMyComments(user.sub, query);
  }

  @Get('ratings')
  @ProfileRatingsDocs()
  @HttpCode(HttpStatus.OK)
  getMyRatings(
    @CurrentUser() user: JwtPayload,
    @Query() query: SocialQueryDto,
  ) {
    return this.profileService.getMyRatings(user.sub, query);
  }

  @Patch('push-token')
  @HttpCode(HttpStatus.OK)
  updatePushToken(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdatePushTokenDto,
  ) {
    return this.profileService.updatePushToken(user.sub, dto);
  }
}
