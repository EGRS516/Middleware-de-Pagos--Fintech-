import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const config = new DocumentBuilder()
    .setTitle('Middleware de Pagos Universal')
    .setDescription(
      'API unificada para procesamiento de pagos con Stripe y PayPal. ' +
      'Incluye webhooks asíncronos con BullMQ y persistencia con PostgreSQL.',
    )
    .setVersion('1.0')
    .addTag('Payments', 'Operaciones de creación y consulta de pagos')
    .addTag('Webhooks', 'Endpoints para recibir notificaciones de proveedores')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`🚀 Aplicación corriendo en: http://localhost:${port}`);
  logger.log(`📚 Documentación Swagger en: http://localhost:${port}/api`);
}
bootstrap();