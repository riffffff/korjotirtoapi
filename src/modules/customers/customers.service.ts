import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { MeterReading } from '../meter-readings/entities/meter-reading.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(MeterReading)
    private meterReadingRepository: Repository<MeterReading>,
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

    // Create audit log
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

    // Check for duplicate customerNumber if updating
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

    // Create audit log
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

  async remove(id: number, performedBy = 'System', ipAddress?: string) {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');

    // Check if customer has meter readings
    const meterReadingCount = await this.meterReadingRepository.count({
      where: { customerId: id },
    });

    if (meterReadingCount > 0) {
      throw new BadRequestException(
        `Cannot delete customer "${customer.name}" because they have ${meterReadingCount} meter reading(s). ` +
        `Please delete all meter readings first.`
      );
    }

    // Create audit log before deletion
    await this.auditLogsService.log({
      action: AuditAction.DELETE,
      entityType: 'customers',
      entityId: id,
      performedBy,
      ipAddress,
      details: { name: customer.name, customerNumber: customer.customerNumber },
      description: `Deleted customer "${customer.name}" (number: ${customer.customerNumber})`,
    });

    await this.customerRepository.remove(customer);
    return { message: 'Customer deleted successfully' };
  }
}
