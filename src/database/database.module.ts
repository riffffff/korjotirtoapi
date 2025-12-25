import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeederService } from './seeder.service';
import { Customer } from '../modules/customers/entities/customer.entity';
import { MeterReading } from '../modules/meter-readings/entities/meter-reading.entity';
import { Bill } from '../modules/bills/entities/bill.entity';
import { BillItem } from '../modules/bills/entities/bill-item.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Customer, MeterReading, Bill, BillItem])],
    providers: [SeederService],
})
export class DatabaseModule { }
