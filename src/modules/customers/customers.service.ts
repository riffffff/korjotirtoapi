import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { MeterReading } from '../meter-readings/entities/meter-reading.entity';
import { Bill } from '../bills/entities/bill.entity';
import { BillItem } from '../bills/entities/bill-item.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(MeterReading)
    private meterReadingRepository: Repository<MeterReading>,
    @InjectRepository(Bill)
    private billRepository: Repository<Bill>,
    @InjectRepository(BillItem)
    private billItemRepository: Repository<BillItem>,
    private auditLogsService: AuditLogsService,
  ) { }

  async create(dto: CreateCustomerDto, performedBy = 'System', ipAddress?: string) {
    // Check for duplicate customerNumber
    const existing = await this.customerRepository.findOne({
      where: { customerNumber: dto.customerNumber },
    });
    if (existing) {
      throw new ConflictException(`Customer with number ${dto.customerNumber} already exists`);
    }

    const customer = this.customerRepository.create(dto);
    const saved = await this.customerRepository.save(customer);

    await this.auditLogsService.log({
      action: AuditAction.CREATE,
      entityType: 'customers',
      entityId: saved.id,
      performedBy,
      ipAddress,
      details: { name: saved.name, customerNumber: saved.customerNumber },
      description: `Created customer "${saved.name}" with number ${saved.customerNumber}`,
    });

    return saved;
  }

  async findAll(page = 1, limit = 10) {
    const [data, total] = await this.customerRepository.findAndCount({
      order: { customerNumber: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const customer = await this.customerRepository
      .createQueryBuilder('c')
      .leftJoin('c.meterReadings', 'r')
      .leftJoin('r.bill', 'b')
      .select([
        'c.id', 'c.name', 'c.customerNumber', 'c.outstandingBalance', 'c.createdAt', 'c.updatedAt',
        'r.id', 'r.period', 'r.meterStart', 'r.meterEnd', 'r.usage',
        'b.id', 'b.totalAmount', 'b.paymentStatus', 'b.paidAt',
      ])
      .where('c.id = :id', { id })
      .getOne();

    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(id: number, dto: UpdateCustomerDto, performedBy = 'System', ipAddress?: string) {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');

    if (dto.customerNumber && dto.customerNumber !== customer.customerNumber) {
      const existing = await this.customerRepository.findOne({
        where: { customerNumber: dto.customerNumber },
      });
      if (existing) {
        throw new ConflictException(`Customer with number ${dto.customerNumber} already exists`);
      }
    }

    const oldData = { name: customer.name, customerNumber: customer.customerNumber };
    Object.assign(customer, dto);
    const saved = await this.customerRepository.save(customer);

    await this.auditLogsService.log({
      action: AuditAction.UPDATE,
      entityType: 'customers',
      entityId: saved.id,
      performedBy,
      ipAddress,
      details: { before: oldData, after: { name: saved.name, customerNumber: saved.customerNumber } },
      description: `Updated customer #${saved.id}`,
    });

    return saved;
  }

  // SOFT DELETE - cascade delete meter readings, bills, bill items
  async remove(id: number, performedBy = 'System', ipAddress?: string) {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');

    // Get all meter readings for this customer
    const meterReadings = await this.meterReadingRepository.find({
      where: { customerId: id },
      relations: ['bill', 'bill.items'],
    });

    // Soft delete all related bill items, bills, and meter readings
    for (const reading of meterReadings) {
      if (reading.bill) {
        // Soft delete bill items
        if (reading.bill.items && reading.bill.items.length > 0) {
          await this.billItemRepository.softRemove(reading.bill.items);
        }
        // Soft delete bill
        await this.billRepository.softRemove(reading.bill);
      }
      // Soft delete meter reading
      await this.meterReadingRepository.softRemove(reading);
    }

    // Soft delete customer
    await this.customerRepository.softRemove(customer);

    await this.auditLogsService.log({
      action: AuditAction.DELETE,
      entityType: 'customers',
      entityId: id,
      performedBy,
      ipAddress,
      details: {
        name: customer.name,
        customerNumber: customer.customerNumber,
        deletedMeterReadings: meterReadings.length,
      },
      description: `Soft deleted customer "${customer.name}" with ${meterReadings.length} meter reading(s)`,
    });

    return {
      message: 'Customer and related data soft deleted successfully',
      deletedMeterReadings: meterReadings.length,
    };
  }

  // GET TRASHED CUSTOMERS
  async findTrashed(page = 1, limit = 10) {
    const [data, total] = await this.customerRepository.findAndCount({
      where: { deletedAt: Not(IsNull()) },
      withDeleted: true,
      order: { deletedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // RESTORE SOFT DELETED CUSTOMER
  async restore(id: number, performedBy = 'System', ipAddress?: string) {
    // Find with deleted
    const customer = await this.customerRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!customer) throw new NotFoundException('Customer not found');
    if (!customer.deletedAt) throw new ConflictException('Customer is not deleted');

    // Restore customer
    await this.customerRepository.restore(id);

    // Restore related meter readings, bills, and bill items
    const meterReadings = await this.meterReadingRepository.find({
      where: { customerId: id },
      withDeleted: true,
      relations: ['bill', 'bill.items'],
    });

    for (const reading of meterReadings) {
      if (reading.deletedAt) {
        await this.meterReadingRepository.restore(reading.id);

        if (reading.bill && reading.bill.deletedAt) {
          await this.billRepository.restore(reading.bill.id);

          if (reading.bill.items) {
            for (const item of reading.bill.items) {
              if (item.deletedAt) {
                await this.billItemRepository.restore(item.id);
              }
            }
          }
        }
      }
    }

    await this.auditLogsService.log({
      action: AuditAction.UPDATE,
      entityType: 'customers',
      entityId: id,
      performedBy,
      ipAddress,
      details: { name: customer.name, action: 'restore' },
      description: `Restored customer "${customer.name}" from trash`,
    });

    return {
      message: 'Customer and related data restored successfully',
      restoredMeterReadings: meterReadings.filter(r => r.deletedAt).length,
    };
  }

  // PERMANENT DELETE
  async forceDelete(id: number, performedBy = 'System', ipAddress?: string) {
    const customer = await this.customerRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!customer) throw new NotFoundException('Customer not found');

    // This will permanently delete
    await this.customerRepository.delete(id);

    await this.auditLogsService.log({
      action: AuditAction.DELETE,
      entityType: 'customers',
      entityId: id,
      performedBy,
      ipAddress,
      details: { name: customer.name, permanent: true },
      description: `Permanently deleted customer "${customer.name}"`,
    });

    return { message: 'Customer permanently deleted' };
  }
}
