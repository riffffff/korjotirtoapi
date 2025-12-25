import { Controller, Get, Post, Body, Delete, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { MeterReadingsService } from './meter-readings.service';
import { CreateMeterReadingDto } from './dto/create-meter-reading.dto';
import { ApiOperation, ApiTags, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Meter Readings')
@ApiBearerAuth('access-token')
@Controller('meter-readings')
export class MeterReadingsController {
  constructor(private readonly service: MeterReadingsService) { }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Catat stand meter baru (Admin/Operator only)' })
  create(
    @Body() dto: CreateMeterReadingDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    return this.service.create(dto, user?.username, ipAddress);
  }

  @Get('report')
  @ApiOperation({ summary: 'Laporan tagihan per bulan (untuk tabel admin)' })
  @ApiQuery({ name: 'period', example: '2025-01', description: 'Format: YYYY-MM' })
  getReport(@Query('period') period: string) {
    return this.service.getReport(period);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lihat detail meter reading' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Hapus data (Admin only)' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    return this.service.remove(+id, user?.username, ipAddress);
  }
}
