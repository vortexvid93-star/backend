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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SWAGGER_TAGS } from '../../common/swagger/constants';
import { AdminRoleGuard } from '../guards/admin-role.guard';
import {
  AdminCommentsControllerDocs,
  AdminCommentsDeleteDocs,
  AdminCommentsListDocs,
  AdminCommentsModerateDocs,
} from './admin-comments.controller.docs';
import { AdminCommentsService } from './admin-comments.service';
import { AdminCommentsQueryDto } from './dto/admin-comments-query.dto';
import { ModerateCommentDto } from './dto/moderate-comment.dto';

@ApiTags(SWAGGER_TAGS.ADMIN_MODERATION)
@AdminCommentsControllerDocs()
@Controller('admin/comments')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminCommentsController {
  constructor(private readonly adminCommentsService: AdminCommentsService) {}

  @Get()
  @AdminCommentsListDocs()
  @HttpCode(HttpStatus.OK)
  listComments(@Query() query: AdminCommentsQueryDto) {
    return this.adminCommentsService.listComments(query);
  }

  @Patch(':id/moderate')
  @AdminCommentsModerateDocs()
  @HttpCode(HttpStatus.OK)
  moderateComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerateCommentDto,
  ) {
    return this.adminCommentsService.moderateComment(id, dto);
  }

  @Delete(':id')
  @AdminCommentsDeleteDocs()
  @HttpCode(HttpStatus.OK)
  deleteComment(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminCommentsService.deleteComment(id);
  }
}
