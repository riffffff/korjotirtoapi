import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './modules/auth/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  @Public()
  @ApiOperation({ summary: 'API Info' })
  getInfo() {
    return {
      name: 'Korjo Tirto API',
      description: 'Sistem Pembayaran Air Desa Sukorejo',
      version: '1.0.0',
      status: 'running',
      docs: '/api/docs',
    };
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health Check for Render' })
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
