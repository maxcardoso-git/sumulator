import { Module } from '@nestjs/common';
import { DataGeneratorController } from './data-generator.controller';
import { DataGeneratorService } from './data-generator.service';

@Module({
  controllers: [DataGeneratorController],
  providers: [DataGeneratorService],
  exports: [DataGeneratorService],
})
export class DataGeneratorModule {}
