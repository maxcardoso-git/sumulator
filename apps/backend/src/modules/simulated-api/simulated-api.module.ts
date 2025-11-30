import { Module } from '@nestjs/common';
import { SimulatedApiController } from './simulated-api.controller';
import { SimulatedApiService } from './simulated-api.service';
import { SimulatedApiProxyController } from './simulated-api-proxy.controller';

@Module({
  controllers: [SimulatedApiController, SimulatedApiProxyController],
  providers: [SimulatedApiService],
  exports: [SimulatedApiService],
})
export class SimulatedApiModule {}
