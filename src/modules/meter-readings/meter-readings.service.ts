import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MeterReading } from './entities/meter-reading.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Bill } from '../bills/entities/bill.entity';
import { BillItem } from '../bills/entities/bill-item.entity';
import { SettingsService } from '../settings/settings.service';
import { CreateMeterReadingDto } from './dto/create-meter-reading.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';

// Validate period format (YYYY-MM)
function isValidPeriodFormat(period: string): boolean {
  const regex = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (!regex.test(period)) return false;

  const [year, month] = period.split('-').map(Number);
  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;

  return true;
}

@Injectable()
export class MeterReadingsService {
  constructor(
    @InjectRepository(MeterReading)
    private meterReadingRepository: Repository<MeterReading>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Bill)
    private billRepository: Repository<Bill>,
    @InjectRepository(BillItem)
    private billItemRepository: Repository<BillItem>,
    private settingsService: SettingsService,
    private auditLogsService: AuditLogsService,
    private dataSource: DataSource,
  ) { }

  async create(dto: CreateMeterReadingDto, performedBy = 'System', ipAddress?: string) {
    // Validate period format
    if (!isValidPeriodFormat(dto.period)) {
      throw new BadRequestException(
        `Invalid period format "${dto.period}". Expected format: YYYY-MM (e.g., 2025-12)`
      );
    }

    const customer = await this.customerRepository.findOne({ where: { id: dto.customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    // Check if already exists for this period
    const existing = await this.meterReadingRepository.findOne({
      where: { customerId: dto.customerId, period: dto.period },
    });
    if (existing) {
      throw new BadRequestException(`Meter reading for period ${dto.period} already exists for this customer`);
    }

    const lastReading = await this.meterReadingRepository.findOne({
      where: { customerId: dto.customerId },
      order: { createdAt: 'DESC' },
    });

    const meterStart = lastReading ? lastReading.meterEnd : 0;
    const meterEnd = dto.meterEnd;

    // Validate meterEnd > meterStart
    if (meterEnd < meterStart) {
      throw new BadRequestException(`meterEnd (${meterEnd}) must be greater than or equal to last reading (${meterStart})`);
    }

    const usage = meterEnd - meterStart;

    // Use transaction to ensure atomicity - if bill creation fails, reading is also rolled back
    return this.dataSource.transaction(async (manager) => {
      const readingRepo = manager.getRepository(MeterReading);
      const billRepo = manager.getRepository(Bill);
      const billItemRepo = manager.getRepository(BillItem);
      const customerRepo = manager.getRepository(Customer);

      const reading = await readingRepo.save({
        customerId: dto.customerId,
        period: dto.period,
        meterStart,
        meterEnd,
        usage,
      });

      const { rateK1, rateK2, limitK1, adminFee } = await this.settingsService.getCurrentRates();

      const k1Usage = Math.min(usage, limitK1);
      const k2Usage = Math.max(usage - limitK1, 0);
      const k1Amount = k1Usage * rateK1;
      const k2Amount = k2Usage * rateK2;
      const totalAmount = adminFee + k1Amount + k2Amount;

      const bill = await billRepo.save({
        meterReadingId: reading.id,
        totalAmount,
        paymentStatus: 'pending',
      });

      await billItemRepo.save([
        { billId: bill.id, type: 'ADMIN_FEE', usage: 0, rate: adminFee, amount: adminFee },
        { billId: bill.id, type: 'K1', usage: k1Usage, rate: rateK1, amount: k1Amount },
        { billId: bill.id, type: 'K2', usage: k2Usage, rate: rateK2, amount: k2Amount },
      ]);

      customer.outstandingBalance = Number(customer.outstandingBalance) + totalAmount;
      await customerRepo.save(customer);

      // Create audit log
      await this.auditLogsService.log({
        action: AuditAction.CREATE,
        entityType: 'meter_readings',
        entityId: reading.id,
        performedBy,
        ipAddress,
        details: {
          customerId: customer.id,
          customerName: customer.name,
          period: dto.period,
          meterStart,
          meterEnd,
          usage,
          billId: bill.id,
          totalAmount,
        },
        description: `Created meter reading for "${customer.name}" period ${dto.period} (usage: ${usage}m³, bill: Rp${totalAmount.toLocaleString('id-ID')})`,
      });

      return {
        id: reading.id,
        period: reading.period,
        meterStart: reading.meterStart,
        meterEnd: reading.meterEnd,
        usage: reading.usage,
        customer: { id: customer.id, name: customer.name, customerNumber: customer.customerNumber },
        bill: {
          id: bill.id,
          totalAmount: bill.totalAmount,
          paymentStatus: bill.paymentStatus,
          items: [
            { type: 'ADMIN_FEE', usage: 0, rate: adminFee, amount: adminFee },
            { type: 'K1', usage: k1Usage, rate: rateK1, amount: k1Amount },
            { type: 'K2', usage: k2Usage, rate: rateK2, amount: k2Amount },
          ],
        },
        createdAt: reading.createdAt,
        updatedAt: reading.updatedAt,
      };
    });
  }

  async getReport(period: string) {
    // Validate period format
    if (!isValidPeriodFormat(period)) {
      throw new BadRequestException(
        `Invalid period format "${period}". Expected format: YYYY-MM (e.g., 2025-12)`
      );
    }

    const readings = await this.meterReadingRepository
      .createQueryBuilder('r')
      .leftJoin('r.customer', 'c')
      .leftJoin('r.bill', 'b')
      .leftJoin('b.items', 'i')
      .select([
        'r.id', 'r.period', 'r.meterStart', 'r.meterEnd', 'r.usage', 'r.createdAt', 'r.updatedAt',
        'c.id', 'c.name', 'c.customerNumber',
        'b.id', 'b.totalAmount', 'b.paymentStatus', 'b.paidAt',
        'i.type', 'i.usage', 'i.rate', 'i.amount',
      ])
      .where('r.period = :period', { period })
      .orderBy('c.customerNumber', 'ASC')
      .getMany();

    return {
      period,
      data: readings,
    };
  }

  async findOne(id: number) {
    const r = await this.meterReadingRepository
      .createQueryBuilder('r')
      .leftJoin('r.customer', 'c')
      .leftJoin('r.bill', 'b')
      .leftJoin('b.items', 'i')
      .select([
        'r.id', 'r.period', 'r.meterStart', 'r.meterEnd', 'r.usage', 'r.createdAt', 'r.updatedAt',
        'c.id', 'c.name', 'c.customerNumber',
        'b.id', 'b.totalAmount', 'b.paymentStatus', 'b.paidAt',
        'i.type', 'i.usage', 'i.rate', 'i.amount',
      ])
      .where('r.id = :id', { id })
      .getOne();

    if (!r) throw new NotFoundException('Data not found');
    return r;
  }

  async remove(id: number, performedBy = 'System', ipAddress?: string) {
    const reading = await this.meterReadingRepository.findOne({
      where: { id },
      relations: ['customer', 'bill'],
    });
    if (!reading) throw new NotFoundException('Data not found');

    // Use transaction for deletion
    return this.dataSource.transaction(async (manager) => {
      const readingRepo = manager.getRepository(MeterReading);
      const customerRepo = manager.getRepository(Customer);

      if (reading.bill && reading.bill.paymentStatus === 'pending') {
        reading.customer.outstandingBalance =
          Number(reading.customer.outstandingBalance) - Number(reading.bill.totalAmount);
        await customerRepo.save(reading.customer);
      }

      // Create audit log before deletion
      await this.auditLogsService.log({
        action: AuditAction.DELETE,
        entityType: 'meter_readings',
        entityId: id,
        performedBy,
        ipAddress,
        details: {
          customerId: reading.customer?.id,
          customerName: reading.customer?.name,
          period: reading.period,
          usage: reading.usage,
          billId: reading.bill?.id,
          billStatus: reading.bill?.paymentStatus,
        },
        description: `Deleted meter reading #${id} for "${reading.customer?.name}" period ${reading.period}`,
      });

      await readingRepo.remove(reading);
      return { message: 'Data deleted successfully' };
    });
  }
}
