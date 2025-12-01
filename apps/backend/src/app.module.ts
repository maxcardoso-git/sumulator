import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { EnvironmentsModule } from './modules/environments/environments.module';
import { ScenariosModule } from './modules/scenarios/scenarios.module';
import { ChatModule } from './modules/chat/chat.module';
import { FormsModule } from './modules/forms/forms.module';
import { DataGeneratorModule } from './modules/data-generator/data-generator.module';
import { SemanticDomainModule } from './modules/semantic-domain/semantic-domain.module';
import { SimulatedApiModule } from './modules/simulated-api/simulated-api.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { EventsModule } from './modules/events/events.module';
import { ExternalApisModule } from './modules/external-apis/external-apis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    EnvironmentsModule,
    ScenariosModule,
    ChatModule,
    FormsModule,
    DataGeneratorModule,
    SemanticDomainModule,
    SimulatedApiModule,
    WebhooksModule,
    ObservabilityModule,
    EventsModule,
    ExternalApisModule,
  ],
})
export class AppModule {}
