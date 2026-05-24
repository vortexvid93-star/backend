import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiJwtAdmin } from '../../common/swagger/decorators';
import { PaginatedAdminPaymentListSchema } from '../../common/swagger/schemas/admin.schema';

export const AdminPaymentsControllerDocs = () => ApiJwtAdmin();

export const AdminPaymentsListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Liste admin des paiements',
      description: 'Transactions paginées avec filtres statut, plan, période.',
    }),
    ApiOkResponse({ type: PaginatedAdminPaymentListSchema }),
  );
