import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = new Logger('Bootstrap');
  const port = process.env.PORT ?? 3002;

  app.enableCors({
    origin: ['http://localhost:3000'], // frontend URl
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  await app.listen(port);
  logger.log(`Application started on port ${port}`);
}
bootstrap();
