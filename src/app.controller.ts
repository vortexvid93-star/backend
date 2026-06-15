import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SWAGGER_TAGS } from './common/swagger/constants';
import { AppService } from './app.service';

@ApiTags(SWAGGER_TAGS.APP)
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Santé de l’API',
    description:
      'Endpoint racine pour vérifier que le serveur répond. **Frontend** : health check / monitoring uniquement — ne pas utiliser pour les données métier.',
  })
  @ApiOkResponse({
    description: 'Message de bienvenue.',
    schema: { type: 'string', example: 'Hello World!' },
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Health check (serveur + base de données)',
    description:
      'Vérifie la connectivité PostgreSQL via `SELECT 1`. Retourne HTTP 200 si la base répond, sinon HTTP 503. ' +
      '**Ops** : sonde de monitoring (Kubernetes, UptimeRobot, etc.).',
  })
  @ApiOkResponse({
    description: 'Serveur et base opérationnels.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        database: { type: 'string', example: 'up' },
        response_time_ms: { type: 'number', example: 12 },
      },
    },
  })
  @ApiServiceUnavailableResponse({
    description: 'Base de données inaccessible.',
  })
  async getHealth() {
    const payload = await this.appService.getHealth();
    if (payload.database !== 'up') {
      throw new ServiceUnavailableException(payload);
    }
    return payload;
  }
}
