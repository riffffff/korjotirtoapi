import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../modules/customers/entities/customer.entity';
import { MeterReading } from '../modules/meter-readings/entities/meter-reading.entity';
import { Bill } from '../modules/bills/entities/bill.entity';
import { BillItem } from '../modules/bills/entities/bill-item.entity';

@Injectable()
export class SeederService implements OnModuleInit {
    private readonly ADMIN_FEE = 3000;
    private readonly RATE_K1 = 1200;
    private readonly RATE_K2 = 3000;
    private readonly LIMIT_K1 = 40;

    constructor(
        @InjectRepository(Customer)
        private customerRepository: Repository<Customer>,
        @InjectRepository(MeterReading)
        private meterReadingRepository: Repository<MeterReading>,
        @InjectRepository(Bill)
        private billRepository: Repository<Bill>,
        @InjectRepository(BillItem)
        private billItemRepository: Repository<BillItem>,
    ) { }

    async onModuleInit() {
        await this.seed();
    }

    async seed() {
        const count = await this.customerRepository.count();
        if (count > 0) {
            console.log('✓ Data already seeded');
            return;
        }

        console.log('🌱 Seeding data...');

        const customerNames = [
            'Ibu SUHENI', 'Bpk. HARSONO', 'Bpk. ARIF RIYADI', 'Ibu SUKINEM', 'Ibu PAIYEM',
            'Bpk. HERU', 'Ibu SRI SUMARNI', 'Bpk. SUKINO', 'Ibu SUNARTI', 'Bpk. AGUS WIRANTO',
            'Bpk. SUMARDI', 'Bpk. JOKO SURYANTO', 'Ibu MARYATUN', 'Bpk. SUMINO', 'MASJID AR-ROHMAN',
            'Ibu SULAMI', 'Bpk. SUBARDI', 'Bpk. SUKARDI RT. 01', 'Bpk. BAHRUN', 'Bpk. MUDI',
            'Bpk. SUYADI', 'Ibu SRI MUJIYAH', 'Bpk. SUYARTO', 'Bpk. HERI GUNAWAN', 'Bpk. ANDAR',
        ];

        const meterStarts = [
            371, 1534, 1517, 2907, 2525, 680, 2640, 5678, 158, 1062,
            3720, 3400, 1088, 1708, 1625, 2266, 3680, 1880, 1225, 433,
            1016, 3079, 594, 2643, 473
        ];

        const usagePatterns = [
            [7, 10, 8], [10, 12, 11], [27, 30, 25], [11, 14, 12], [15, 18, 16],
            [16, 20, 18], [20, 25, 22], [39, 42, 40], [2, 3, 2], [9, 11, 10],
            [25, 28, 26], [21, 24, 22], [3, 4, 3], [12, 15, 13], [15, 17, 16],
            [2, 3, 2], [12, 14, 13], [19, 22, 20], [1, 2, 1], [0, 1, 0],
            [17, 20, 18], [12, 15, 13], [0, 1, 0], [3, 5, 4], [5, 7, 6]
        ];

        const periods = ['2025-10', '2025-11', '2025-12'];

        for (let i = 0; i < 25; i++) {
            const customer = this.customerRepository.create({
                name: customerNames[i],
                customerNumber: 1001 + i,
                outstandingBalance: 0,
            });
            const savedCustomer = await this.customerRepository.save(customer);

            let meterStart = meterStarts[i];
            let totalOutstanding = 0;

            for (let j = 0; j < 3; j++) {
                const usage = usagePatterns[i][j];
                const meterEnd = meterStart + usage;

                const reading = this.meterReadingRepository.create({
                    customerId: savedCustomer.id,
                    period: periods[j],
                    meterStart,
                    meterEnd,
                    usage,
                });
                const savedReading = await this.meterReadingRepository.save(reading);

                const k1Usage = Math.min(usage, this.LIMIT_K1);
                const k2Usage = Math.max(usage - this.LIMIT_K1, 0);
                const k1Amount = k1Usage * this.RATE_K1;
                const k2Amount = k2Usage * this.RATE_K2;
                const total = this.ADMIN_FEE + k1Amount + k2Amount;

                const isPaid = i < 15;

                const bill = this.billRepository.create({
                    meterReadingId: savedReading.id,
                    totalAmount: total,
                    paymentStatus: isPaid ? 'paid' : 'pending',
                });
                if (isPaid) {
                    bill.paidAt = new Date();
                }
                const savedBill = await this.billRepository.save(bill);

                const billItems = [
                    { billId: savedBill.id, type: 'ADMIN_FEE', usage: 0, rate: this.ADMIN_FEE, amount: this.ADMIN_FEE },
                    { billId: savedBill.id, type: 'K1', usage: k1Usage, rate: this.RATE_K1, amount: k1Amount },
                    { billId: savedBill.id, type: 'K2', usage: k2Usage, rate: this.RATE_K2, amount: k2Amount },
                ];
                await this.billItemRepository.save(billItems.map(item => this.billItemRepository.create(item)));

                if (!isPaid) {
                    totalOutstanding += total;
                }

                meterStart = meterEnd;
            }

            savedCustomer.outstandingBalance = totalOutstanding;
            await this.customerRepository.save(savedCustomer);
        }

        console.log('✓ Seeded 25 customers');
        console.log('✓ Seeded 75 meter readings (3 months x 25 customers)');
        console.log('✓ Seeded 75 bills (45 paid, 30 pending)');
        console.log('✓ Seeded 225 bill items');
    }
}
