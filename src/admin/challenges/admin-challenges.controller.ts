import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SWAGGER_TAGS } from '../../common/swagger/constants';
import { AdminRoleGuard } from '../guards/admin-role.guard';
import {
  AdminChallengesCancelDocs,
  AdminChallengesControllerDocs,
  AdminChallengesCreateDocs,
  AdminChallengesListDocs,
  AdminChallengesParticipantsDocs,
  AdminChallengesUpdateDocs,
} from './admin-challenges.controller.docs';
import { AdminChallengesService } from './admin-challenges.service';
import { AdminChallengeParticipantsQueryDto } from './dto/admin-challenge-participants-query.dto';
import { AdminChallengesQueryDto } from './dto/admin-challenges-query.dto';
import { CreateAdminChallengeDto } from './dto/create-admin-challenge.dto';
import { UpdateAdminChallengeDto } from './dto/update-admin-challenge.dto';

@ApiTags(SWAGGER_TAGS.ADMIN_CHALLENGES)
@AdminChallengesControllerDocs()
@Controller('admin/challenges')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminChallengesController {
  constructor(private readonly adminChallengesService: AdminChallengesService) {}

  @Get()
  @AdminChallengesListDocs()
  @HttpCode(HttpStatus.OK)
  listChallenges(@Query() query: AdminChallengesQueryDto) {
    return this.adminChallengesService.listChallenges(query);
  }

  @Post()
  @AdminChallengesCreateDocs()
  @HttpCode(HttpStatus.CREATED)
  createChallenge(@Body() dto: CreateAdminChallengeDto) {
    return this.adminChallengesService.createChallenge(dto);
  }

  @Patch(':id/cancel')
  @AdminChallengesCancelDocs()
  @HttpCode(HttpStatus.OK)
  cancelChallenge(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminChallengesService.cancelChallenge(id);
  }

  @Get(':id/participants')
  @AdminChallengesParticipantsDocs()
  @HttpCode(HttpStatus.OK)
  listParticipants(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: AdminChallengeParticipantsQueryDto,
  ) {
    return this.adminChallengesService.listParticipants(id, query);
  }

  @Patch(':id')
  @AdminChallengesUpdateDocs()
  @HttpCode(HttpStatus.OK)
  updateChallenge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminChallengeDto,
  ) {
    return this.adminChallengesService.updateChallenge(id, dto);
  }
}
