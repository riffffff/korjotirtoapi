import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Bill } from './entities/bill.entity';
import { PayBillDto } from './dto/pay-bill.dto';
import { SettingsService } from '../settings/settings.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';

@Injectable()
export class BillsService {
    constructor(
        @InjectRepository(Bill)
        private billRepository: Repository<Bill>,
        private settingsService: SettingsService,
        private auditLogsService: AuditLogsService,
        private dataSource: DataSource,
    ) { }

    async findPending() {
        const bills = await this.billRepository
            .createQueryBuilder('b')
            .leftJoin('b.meterReading', 'r')
            .leftJoin('r.customer', 'c')
            .select([
                'b.id', 'b.totalAmount', 'b.paymentStatus', 'b.remaining',
                'r.period',
                'c.id', 'c.name', 'c.customerNumber',
            ])
            .where('b.paymentStatus IN (:...statuses)', { statuses: ['pending', 'partial'] })
            .orderBy('b.createdAt', 'DESC')
            .getMany();

        return bills.map(b => ({
            id: b.id,
            period: b.meterReading?.period,
            customer: {
                id: b.meterReading?.customer?.id,
                name: b.meterReading?.customer?.name,
                customerNumber: b.meterReading?.customer?.customerNumber,
            },
            totalAmount: b.totalAmount,
            remaining: b.remaining,
            paymentStatus: b.paymentStatus,
        }));
    }

    async findOne(id: number) {
        const bill = await this.billRepository
            .createQueryBuilder('b')
            .leftJoin('b.meterReading', 'r')
            .leftJoin('r.customer', 'c')
            .select([
                'b.id', 'b.totalAmount', 'b.paymentStatus', 'b.penalty', 'b.amountPaid', 'b.remaining', 'b.change', 'b.paidAt',
                'r.period',
                'c.id', 'c.name', 'c.customerNumber',
            ])
            .where('b.id = :id', { id })
            .getOne();

        if (!bill) throw new NotFoundException('Bill not found');

        return {
            id: bill.id,
            period: bill.meterReading?.period,
            customer: {
                id: bill.meterReading?.customer?.id,
                name: bill.meterReading?.customer?.name,
                customerNumber: bill.meterReading?.customer?.customerNumber,
            },
            totalAmount: bill.totalAmount,
            penalty: bill.penalty,
            amountPaid: bill.amountPaid,
            remaining: bill.remaining,
            change: bill.change,
            paymentStatus: bill.paymentStatus,
            paidAt: bill.paidAt,
        };
    }

    async pay(id: number, dto: PayBillDto, performedBy = 'System', ipAddress?: string) {
        // Use transaction for data consistency
        return this.dataSource.transaction(async (manager) => {
            const billRepo = manager.getRepository(Bill);

            const bill = await billRepo.findOne({
                where: { id },
                relations: ['meterReading', 'meterReading.customer'],
            });
            if (!bill) throw new NotFoundException('Bill not found');

            if (bill.paymentStatus === 'paid') {
                throw new BadRequestException('Bill already paid');
            }

            // Get penalty from settings instead of hardcoded
            const penaltyAmount = await this.settingsService.getValue('PENALTY_AMOUNT');
            const penalty = dto.hasPenalty ? penaltyAmount : 0;

            // Calculate total to pay (for partial, use remaining)
            const currentRemaining = bill.paymentStatus === 'partial'
                ? Number(bill.remaining)
                : Number(bill.totalAmount) + penalty;

            const amountPaid = dto.amountPaid;
            let newRemaining = currentRemaining - amountPaid;
            let change = 0;
            let status = 'partial';

            if (newRemaining <= 0) {
                // Fully paid or overpaid
                change = Math.abs(newRemaining);
                newRemaining = 0;
                status = 'paid';
            }

            // Update bill
            bill.penalty = bill.paymentStatus === 'pending' ? penalty : bill.penalty;
            bill.amountPaid = Number(bill.amountPaid) + amountPaid;
            bill.remaining = newRemaining;
            bill.change = change;
            bill.paymentStatus = status;
            if (status === 'paid') {
                bill.paidAt = new Date();
            }
            await billRepo.save(bill);

            // Update customer outstanding balance
            if (bill.meterReading?.customer) {
                bill.meterReading.customer.outstandingBalance =
                    Number(bill.meterReading.customer.outstandingBalance) - amountPaid;
                await manager.save(bill.meterReading.customer);
            }

            // Create audit log
            await this.auditLogsService.log({
                action: AuditAction.PAYMENT,
                entityType: 'bills',
                entityId: bill.id,
                performedBy,
                ipAddress,
                details: {
                    amountPaid,
                    penalty,
                    remaining: newRemaining,
                    change,
                    status,
                    customerId: bill.meterReading?.customer?.id,
                    customerName: bill.meterReading?.customer?.name,
                },
                description: `Payment of Rp${amountPaid.toLocaleString('id-ID')} for bill #${bill.id}${status === 'paid' ? ' (PAID)' : ' (PARTIAL)'}`,
            });

            return {
                message: status === 'paid' ? 'Payment complete' : 'Partial payment recorded',
                billId: bill.id,
                amountPaid: amountPaid,
                remaining: newRemaining,
                change: change,
                paymentStatus: status,
            };
        });
    }
}
