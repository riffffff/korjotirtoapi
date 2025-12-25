import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersModule } from './modules/customers/customers.module';
import { MeterReadingsModule } from './modules/meter-readings/meter-readings.module';
import { SettingsModule } from './modules/settings/settings.module';
import { BillsModule } from './modules/bills/bills.module';
import { DatabaseModule } from './database/database.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Supabase/Render provides DATABASE_URL
        const databaseUrl = configService.get('DATABASE_URL');

        if (databaseUrl) {
          // Production: Use DATABASE_URL from Supabase
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true, // Auto create tables
            ssl: {
              rejectUnauthorized: false,
            },
          };
        }

        // Development: Use individual environment variables
        return {
          type: 'postgres',
          host: configService.get('DATABASE_HOST'),
          port: Number(configService.get('DATABASE_PORT')),
          username: configService.get('DATABASE_USER'),
          password: configService.get('DATABASE_PASSWORD'),
          database: configService.get('DATABASE_NAME'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: configService.get('NODE_ENV') === 'development',
          logging: configService.get('NODE_ENV') === 'development',
        };
      },
    }),
    AuditLogsModule,
    AuthModule,
    DatabaseModule,
    SettingsModule,
    CustomersModule,
    MeterReadingsModule,
    BillsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule { }
