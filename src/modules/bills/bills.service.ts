import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Bill } from './entities/bill.entity';
import { PayBillDto } from './dto/pay-bill.dto';
import { SettingsService } from '../settings/settings.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';

function isValidPeriodFormat(period: string): boolean {
    const regex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!regex.test(period)) return false;
    const [year, month] = period.split('-').map(Number);
    if (year < 2000 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    return true;
}

@Injectable()
export class BillsService {
    constructor(
        @InjectRepository(Bill)
        private billRepository: Repository<Bill>,
        private settingsService: SettingsService,
        private auditLogsService: AuditLogsService,
        private dataSource: DataSource,
    ) { }

    /**
     * GET /bills/period/:period
     * List all bills for a specific period (guest accessible)
     */
    async findByPeriod(period: string) {
        if (!isValidPeriodFormat(period)) {
            throw new BadRequestException(
                `Invalid period format "${period}". Expected format: YYYY-MM (e.g., 2025-01)`
            );
        }

        const bills = await this.billRepository
            .createQueryBuilder('b')
            .leftJoin('b.meterReading', 'r')
            .leftJoin('r.customer', 'c')
            .select([
                'b.id', 'b.totalAmount', 'b.paymentStatus', 'b.remaining', 'b.amountPaid',
                'r.id', 'r.period', 'r.meterStart', 'r.meterEnd', 'r.usage',
                'c.id', 'c.name', 'c.customerNumber',
            ])
            .where('r.period = :period', { period })
            .orderBy('c.customerNumber', 'ASC')
            .getMany();

        return {
            period,
            data: bills.map(b => ({
                id: b.id,
                customer: {
                    id: b.meterReading?.customer?.id,
                    name: b.meterReading?.customer?.name,
                    customerNumber: b.meterReading?.customer?.customerNumber,
                },
                meterEnd: b.meterReading?.meterEnd,
                usage: b.meterReading?.usage,
                totalAmount: b.totalAmount,
                remaining: b.remaining,
                amountPaid: b.amountPaid,
                paymentStatus: b.paymentStatus,
            })),
        };
    }

    /**
     * GET /bills/pending
     * List all pending/partial bills
     */
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

    /**
     * GET /bills/:id
     * Get full bill detail with calculation items
     */
    async findOne(id: number) {
        const bill = await this.billRepository
            .createQueryBuilder('b')
            .leftJoin('b.meterReading', 'r')
            .leftJoin('r.customer', 'c')
            .leftJoin('b.items', 'i')
            .select([
                'b.id', 'b.totalAmount', 'b.paymentStatus', 'b.penalty', 'b.amountPaid', 'b.remaining', 'b.change', 'b.paidAt', 'b.createdAt',
                'r.id', 'r.period', 'r.meterStart', 'r.meterEnd', 'r.usage',
                'c.id', 'c.name', 'c.customerNumber', 'c.outstandingBalance',
                'i.id', 'i.type', 'i.usage', 'i.rate', 'i.amount',
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
                outstandingBalance: bill.meterReading?.customer?.outstandingBalance,
            },
            meterStart: bill.meterReading?.meterStart,
            meterEnd: bill.meterReading?.meterEnd,
            usage: bill.meterReading?.usage,
            items: bill.items?.map(i => ({
                type: i.type,
                usage: i.usage,
                rate: i.rate,
                amount: i.amount,
            })) || [],
            totalAmount: bill.totalAmount,
            penalty: bill.penalty,
            amountPaid: bill.amountPaid,
            remaining: bill.remaining,
            change: bill.change,
            paymentStatus: bill.paymentStatus,
            paidAt: bill.paidAt,
            createdAt: bill.createdAt,
        };
    }

    /**
     * GET /customers/:id/bills
     * Get bill history for a customer
     */
    async findByCustomer(customerId: number) {
        const bills = await this.billRepository
            .createQueryBuilder('b')
            .leftJoin('b.meterReading', 'r')
            .leftJoin('r.customer', 'c')
            .select([
                'b.id', 'b.totalAmount', 'b.paymentStatus', 'b.amountPaid', 'b.remaining', 'b.paidAt',
                'r.period', 'r.meterStart', 'r.meterEnd', 'r.usage',
                'c.id', 'c.name', 'c.customerNumber', 'c.outstandingBalance',
            ])
            .where('c.id = :customerId', { customerId })
            .orderBy('r.period', 'DESC')
            .getMany();

        if (bills.length === 0) {
            return { customer: null, bills: [] };
        }

        const customer = bills[0].meterReading?.customer;

        return {
            customer: customer ? {
                id: customer.id,
                name: customer.name,
                customerNumber: customer.customerNumber,
                outstandingBalance: customer.outstandingBalance,
            } : null,
            bills: bills.map(b => ({
                id: b.id,
                period: b.meterReading?.period,
                meterStart: b.meterReading?.meterStart,
                meterEnd: b.meterReading?.meterEnd,
                usage: b.meterReading?.usage,
                totalAmount: b.totalAmount,
                amountPaid: b.amountPaid,
                remaining: b.remaining,
                paymentStatus: b.paymentStatus,
                paidAt: b.paidAt,
            })),
        };
    }

    /**
     * PATCH /bills/:id/pay
     * Pay a bill
     */
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
