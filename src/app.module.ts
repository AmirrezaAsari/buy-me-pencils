import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';
import { CardInfoModule } from './card-info/card-info.module';
import { UsersController } from './users/users.controller';
import { PaymentController } from './payments/payment.controller';
import { AuthController } from './auth/auth.controller';
@Module({
  imports: [DatabaseModule, AuthModule, UsersModule, PaymentsModule, CardInfoModule],
  controllers: [AppController, UsersController, PaymentController, AuthController],
  providers: [AppService],
})
export class AppModule {}
