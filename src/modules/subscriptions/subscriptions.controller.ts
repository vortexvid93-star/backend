import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthedRequest } from '../../common/types/authed-request';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Lister les abonnements' })
  @ApiResponse({ status: 200, description: 'Liste des abonnements' })
  findAll(@Req() req: AuthedRequest) {
    return this.subscriptionsService.findForActor({
      id: req.user.id,
      role: req.user.role,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Obtenir un abonnement' })
  @ApiResponse({ status: 200, description: 'Abonnement trouvé' })
  findOne(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.subscriptionsService.findOneForActor(id, {
      id: req.user.id,
      role: req.user.role,
    });
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Créer un abonnement' })
  @ApiResponse({ status: 201, description: 'Abonnement créé' })
  create(@Req() req: AuthedRequest, @Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(req.user.id, dto);
  }
}
