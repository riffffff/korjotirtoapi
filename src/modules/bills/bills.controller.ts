import { Controller, Get, Patch, Param, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
import { BillsService } from './bills.service';
import { PayBillDto } from './dto/pay-bill.dto';
import { ApiOperation, ApiTags, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Bills')
@Controller('bills')
export class BillsController {
    constructor(private readonly service: BillsService) { }

    @Get('period/:period')
    @Public()
    @ApiOperation({ summary: 'List all bills for a specific period (YYYY-MM)' })
    @ApiParam({ name: 'period', example: '2025-01', description: 'Format: YYYY-MM' })
    findByPeriod(@Param('period') period: string) {
        return this.service.findByPeriod(period);
    }

    @Get('pending')
    @Public()
    @ApiOperation({ summary: 'Get all pending bills' })
    findPending() {
        return this.service.findPending();
    }

    @Get('customer/:customerId')
    @Public()
    @ApiOperation({ summary: 'Get bill history for a customer' })
    @ApiParam({ name: 'customerId', example: 1, description: 'Customer ID' })
    findByCustomer(@Param('customerId') customerId: string) {
        return this.service.findByCustomer(+customerId);
    }

    @Get(':id')
    @Public()
    @ApiOperation({ summary: 'Get bill detail with calculation items' })
    findOne(@Param('id') id: string) {
        return this.service.findOne(+id);
    }

    @Patch(':id/pay')
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Pay bill - Admin only' })
    pay(
        @Param('id') id: string,
        @Body() dto: PayBillDto,
        @CurrentUser() user: any,
        @Req() req: Request,
    ) {
        const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
        return this.service.pay(+id, dto, user?.username, ipAddress);
    }
}
