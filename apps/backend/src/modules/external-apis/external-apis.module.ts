import { Module } from '@nestjs/common';
import { ExternalApisController } from './external-apis.controller';
import { ExternalApisService } from './external-apis.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExternalApisController],
  providers: [ExternalApisService],
  exports: [ExternalApisService],
})
export class ExternalApisModule {}
