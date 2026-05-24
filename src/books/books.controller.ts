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
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { SWAGGER_TAGS } from '../common/swagger/constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/services/token.service';
import { ChallengesService } from '../challenges/challenges.service';
import { RecommendationsService } from '../discovery/recommendations.service';
import { SimilarBooksQueryDto } from '../discovery/dto/similar-books-query.dto';
import { BooksAccessService } from './books-access.service';
import { BooksCatalogService } from './books-catalog.service';
import { BooksProgressService } from './books-progress.service';
import { BooksSocialService } from './books-social.service';
import {
  BooksActiveAccessDocs,
  BooksChallengesDocs,
  BooksCheckAccessDocs,
  BooksControllerDocs,
  BooksCreateCommentDocs,
  BooksDeleteCommentDocs,
  BooksDetailDocs,
  BooksGenerateAccessDocs,
  BooksGetProgressDocs,
  BooksListCatalogDocs,
  BooksListCommentsDocs,
  BooksRateDocs,
  BooksRatePatchDocs,
  BooksRecentAccessDocs,
  BooksUpdateCommentDocs,
  BooksResourceInfoDocs,
  BooksSimilarDocs,
  BooksStreamDocs,
  BooksUpdateProgressDocs,
} from './books.controller.docs';
import { BookAccessCheckQueryDto } from './dto/book-access-check-query.dto';
import { BookAccessQueryDto } from './dto/book-access-query.dto';
import { BookStreamQueryDto } from './dto/book-stream-query.dto';
import { BooksCatalogQueryDto } from './dto/books-catalog-query.dto';
import { CommentsQueryDto } from './dto/comments-query.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { RateBookDto } from './dto/rate-book.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { RecentAccessQueryDto } from './dto/recent-access-query.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';

@ApiTags(SWAGGER_TAGS.BOOKS)
@BooksControllerDocs()
@Controller('books')
@UseGuards(JwtAuthGuard)
export class BooksController {
  constructor(
    private readonly catalog: BooksCatalogService,
    private readonly access: BooksAccessService,
    private readonly progress: BooksProgressService,
    private readonly social: BooksSocialService,
    private readonly challenges: ChallengesService,
    private readonly recommendations: RecommendationsService,
  ) {}

  @Get()
  @BooksListCatalogDocs()
  @HttpCode(HttpStatus.OK)
  listCatalog(
    @CurrentUser() user: JwtPayload,
    @Query() query: BooksCatalogQueryDto,
  ) {
    return this.catalog.listCatalog(user.sub, query);
  }

  @Get('access/recent')
  @BooksRecentAccessDocs()
  @HttpCode(HttpStatus.OK)
  listRecentAccess(
    @CurrentUser() user: JwtPayload,
    @Query() query: RecentAccessQueryDto,
  ) {
    return this.access.listRecentAccess(user.sub, query);
  }

  @Get(':id/resource')
  @BooksResourceInfoDocs()
  @HttpCode(HttpStatus.OK)
  getResourceInfo(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.access.getResourceInfo(user.sub, id);
  }

  @Get(':id/access/check')
  @BooksCheckAccessDocs()
  @HttpCode(HttpStatus.OK)
  checkAccess(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: BookAccessCheckQueryDto,
  ) {
    return this.access.checkAccess(user.sub, id, query);
  }

  @Get(':id/access/active')
  @BooksActiveAccessDocs()
  @HttpCode(HttpStatus.OK)
  getActiveAccess(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: BookAccessCheckQueryDto,
  ) {
    return this.access.getActiveAccessToken(user.sub, id, query.type);
  }

  @Get(':id/access')
  @BooksGenerateAccessDocs()
  @HttpCode(HttpStatus.OK)
  generateAccessGet(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: BookAccessQueryDto,
  ) {
    return this.access.generateAccessToken(user.sub, id, query);
  }

  @Post(':id/access')
  @BooksGenerateAccessDocs()
  @HttpCode(HttpStatus.OK)
  generateAccessPost(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: BookAccessQueryDto,
  ) {
    return this.access.generateAccessToken(user.sub, id, query);
  }

  @Get(':id/stream')
  @BooksStreamDocs()
  async streamResource(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: BookStreamQueryDto,
    @Res() res: Response,
  ) {
    if (query.validate) {
      const redirectUrl = await this.access.resolveStreamRedirect(
        user.sub,
        id,
        query.token,
        true,
      );
      return res.status(HttpStatus.OK).json({
        valid: true,
        redirect_url: redirectUrl,
        message:
          'Token valide. Utilisez GET /stream sans validate pour obtenir la redirection 302.',
      });
    }

    const location = await this.access.resolveStreamRedirect(
      user.sub,
      id,
      query.token,
      false,
    );
    return res.redirect(HttpStatus.FOUND, location);
  }

  @Get(':id/similar')
  @BooksSimilarDocs()
  @HttpCode(HttpStatus.OK)
  listSimilarBooks(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SimilarBooksQueryDto,
  ) {
    return this.recommendations.getSimilarBooks(user.sub, id, query);
  }

  @Get(':id/challenges')
  @BooksChallengesDocs()
  @HttpCode(HttpStatus.OK)
  listBookChallenges(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.challenges.listChallengesForBook(user.sub, id);
  }

  @Get(':id/progress')
  @BooksGetProgressDocs()
  @HttpCode(HttpStatus.OK)
  getProgress(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.progress.getProgress(user.sub, id);
  }

  @Patch(':id/progress')
  @BooksUpdateProgressDocs()
  @HttpCode(HttpStatus.OK)
  updateProgress(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.progress.updateProgress(user.sub, id, dto);
  }

  @Get(':id/comments')
  @BooksListCommentsDocs()
  @HttpCode(HttpStatus.OK)
  listComments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CommentsQueryDto,
  ) {
    return this.social.listComments(id, query);
  }

  @Post(':id/comments')
  @BooksCreateCommentDocs()
  @HttpCode(HttpStatus.CREATED)
  createComment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.social.createComment(user.sub, id, dto);
  }

  @Patch(':id/comments/:commentId')
  @BooksUpdateCommentDocs()
  @HttpCode(HttpStatus.OK)
  updateComment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.social.updateComment(user.sub, id, commentId, dto);
  }

  @Delete(':id/comments/:commentId')
  @BooksDeleteCommentDocs()
  @HttpCode(HttpStatus.OK)
  deleteComment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    return this.social.deleteComment(user.sub, id, commentId);
  }

  @Post(':id/rate')
  @BooksRateDocs()
  @HttpCode(HttpStatus.OK)
  rateBook(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RateBookDto,
  ) {
    return this.social.rateBook(user.sub, id, dto);
  }

  @Patch(':id/rate')
  @BooksRatePatchDocs()
  @HttpCode(HttpStatus.OK)
  updateRating(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RateBookDto,
  ) {
    return this.social.rateBook(user.sub, id, dto);
  }

  @Get(':id')
  @BooksDetailDocs()
  @HttpCode(HttpStatus.OK)
  getBookDetail(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalog.getBookDetail(user.sub, id);
  }
}
