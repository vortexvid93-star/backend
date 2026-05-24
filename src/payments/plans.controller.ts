import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SWAGGER_TAGS } from '../common/swagger/constants';
import { PlansDetailDocs, PlansListDocs } from './plans.controller.docs';
import { PlansService } from './plans.service';

@ApiTags(SWAGGER_TAGS.PLANS)
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @PlansListDocs()
  listPlans() {
    return this.plansService.listActivePlans();
  }

  @Get(':id')
  @PlansDetailDocs()
  getPlanById(@Param('id', ParseUUIDPipe) id: string) {
    return this.plansService.getPlanById(id);
  }
}
