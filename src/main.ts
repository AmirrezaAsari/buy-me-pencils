import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { validateEnvOnStartup } from './common/env.validation';

async function bootstrap() {
  validateEnvOnStartup();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  const logger = new Logger('Bootstrap');
  const port = process.env.PORT ?? 3002;

  app.enableCors({
    origin: ['http://localhost:3000', 'http://buymeapencil.ir', 'https://buymeapencil.ir' ], // frontend URl
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  await app.listen(port);
  logger.log(`Application started on port ${port}`);
}
bootstrap();
