import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SWAGGER_TAGS } from '../common/swagger/constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthenticatedGuard } from '../auth/guards/jwt-authenticated.guard';
import type { JwtPayload } from '../auth/services/token.service';
import {
  EtablissementsJoinDocs,
  EtablissementsMeDocs,
  EtablissementsOffresDocs,
  EtablissementsPaiementStatutDocs,
  EtablissementsPayerDocs,
} from './etablissements.controller.docs';
import { EtablissementsService } from './etablissements.service';
import { EtablissementPaymentsService } from './etablissement-payments.service';
import { JoinEtablissementDto } from './dto/join-etablissement.dto';
import { PayEtablissementDto } from './dto/pay-etablissement.dto';

@ApiTags(SWAGGER_TAGS.ETABLISSEMENTS)
@Controller('etablissements')
export class EtablissementsController {
  constructor(
    private readonly etablissementsService: EtablissementsService,
    private readonly etablissementPaymentsService: EtablissementPaymentsService,
  ) {}

  @Post('join')
  @UseGuards(JwtAuthenticatedGuard)
  @EtablissementsJoinDocs()
  @HttpCode(HttpStatus.OK)
  join(
    @CurrentUser() user: JwtPayload,
    @Body() dto: JoinEtablissementDto,
  ) {
    return this.etablissementsService.join(user.sub, dto.code);
  }

  @Get('me')
  @UseGuards(JwtAuthenticatedGuard)
  @EtablissementsMeDocs()
  @HttpCode(HttpStatus.OK)
  getMe(@CurrentUser() user: JwtPayload) {
    return this.etablissementsService.getMe(user.sub);
  }

  @Get('offres')
  @EtablissementsOffresDocs()
  @HttpCode(HttpStatus.OK)
  listOffres() {
    return this.etablissementPaymentsService.listOffres();
  }

  @Post('payer')
  @EtablissementsPayerDocs()
  @HttpCode(HttpStatus.OK)
  payer(@Body() dto: PayEtablissementDto) {
    return this.etablissementPaymentsService.payer(dto);
  }

  @Get('paiements/:ref/statut')
  @EtablissementsPaiementStatutDocs()
  @HttpCode(HttpStatus.OK)
  getPaiementStatut(@Param('ref') ref: string) {
    return this.etablissementPaymentsService.getStatut(ref);
  }
}
