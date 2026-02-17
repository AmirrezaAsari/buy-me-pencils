import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = new Logger('Bootstrap');
  const port = process.env.PORT ?? 3002;

  await app.listen(port);
  logger.log(`Application started on port ${port}`);
}
bootstrap();
