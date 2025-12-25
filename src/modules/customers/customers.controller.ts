import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Customers')
@ApiBearerAuth('access-token')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) { }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Tambah pelanggan baru (Admin only)' })
  @ApiResponse({ status: 201, description: 'Pelanggan berhasil ditambahkan' })
  create(
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    return this.customersService.create(createCustomerDto, user?.username, ipAddress);
  }

  @Get()
  @ApiOperation({ summary: 'Lihat semua pelanggan dengan pagination' })
  @ApiResponse({ status: 200, description: 'Daftar pelanggan' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.customersService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lihat detail pelanggan' })
  @ApiResponse({ status: 200, description: 'Detail pelanggan' })
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update pelanggan (Admin only)' })
  @ApiResponse({ status: 200, description: 'Pelanggan berhasil diupdate' })
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    return this.customersService.update(+id, updateCustomerDto, user?.username, ipAddress);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Hapus pelanggan (Admin only)' })
  @ApiResponse({ status: 200, description: 'Pelanggan berhasil dihapus' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    return this.customersService.remove(+id, user?.username, ipAddress);
  }
}
