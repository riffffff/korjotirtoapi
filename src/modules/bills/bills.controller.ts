import { Controller, Get, Patch, Param, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
import { BillsService } from './bills.service';
import { PayBillDto } from './dto/pay-bill.dto';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Bills')
@ApiBearerAuth('access-token')
@Controller('bills')
export class BillsController {
    constructor(private readonly service: BillsService) { }

    @Get('pending')
    @ApiOperation({ summary: 'Get all pending bills' })
    findPending() {
        return this.service.findPending();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get bill detail' })
    findOne(@Param('id') id: string) {
        return this.service.findOne(+id);
    }

    @Patch(':id/pay')
    @Roles(UserRole.ADMIN, UserRole.OPERATOR)
    @ApiOperation({ summary: 'Pay bill - Admin/Operator only' })
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
