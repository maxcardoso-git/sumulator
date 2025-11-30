import { Module } from '@nestjs/common';
import { SemanticDomainController } from './semantic-domain.controller';
import { SemanticDomainService } from './semantic-domain.service';

@Module({
  controllers: [SemanticDomainController],
  providers: [SemanticDomainService],
  exports: [SemanticDomainService],
})
export class SemanticDomainModule {}
