import {
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
import { SWAGGER_TAGS } from '../common/swagger/constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/services/token.service';
import { SearchHistoryQueryDto } from './dto/search-history-query.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import {
  SearchBooksDocs,
  SearchControllerDocs,
  SearchHistoryClearDocs,
  SearchHistoryClickDocs,
  SearchHistoryDeleteDocs,
  SearchHistoryDocs,
} from './search.controller.docs';
import { SearchService } from './search.service';

@ApiTags(SWAGGER_TAGS.SEARCH)
@SearchControllerDocs()
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @SearchBooksDocs()
  @HttpCode(HttpStatus.OK)
  searchBooks(
    @CurrentUser() user: JwtPayload,
    @Query() query: SearchQueryDto,
  ) {
    return this.searchService.searchBooks(user.sub, query);
  }

  @Get('history')
  @SearchHistoryDocs()
  @HttpCode(HttpStatus.OK)
  listSearchHistory(
    @CurrentUser() user: JwtPayload,
    @Query() query: SearchHistoryQueryDto,
  ) {
    return this.searchService.listSearchHistory(user.sub, query);
  }

  @Delete('history')
  @SearchHistoryClearDocs()
  @HttpCode(HttpStatus.OK)
  clearSearchHistory(@CurrentUser() user: JwtPayload) {
    return this.searchService.clearSearchHistory(user.sub);
  }

  @Delete('history/:id')
  @SearchHistoryDeleteDocs()
  @HttpCode(HttpStatus.OK)
  deleteSearchHistory(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.searchService.deleteSearchHistory(user.sub, id);
  }

  @Patch('history/:id/click')
  @SearchHistoryClickDocs()
  @HttpCode(HttpStatus.OK)
  markSearchHistoryClick(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.searchService.markSearchHistoryClick(user.sub, id);
  }
}
