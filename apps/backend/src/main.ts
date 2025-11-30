import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1/simulator');

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Orchestrator Simulator API')
    .setDescription('API para simulação e teste de fluxos do Orquestrador')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticação e autorização')
    .addTag('environments', 'Ambientes de simulação')
    .addTag('scenarios', 'Cenários de teste')
    .addTag('chat', 'Chat Simulator')
    .addTag('forms', 'Form Builder')
    .addTag('data-generator', 'Gerador de dados sintéticos')
    .addTag('semantic-domain', 'Domínio semântico')
    .addTag('sim-apis', 'APIs simuladas')
    .addTag('webhooks', 'Webhooks do Orquestrador')
    .addTag('observability', 'Observabilidade e execuções')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);

  console.log(`🚀 Simulator API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
