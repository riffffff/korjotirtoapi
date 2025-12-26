import { ApiProperty } from "@nestjs/swagger";
import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToOne, Unique, DeleteDateColumn } from "typeorm";
import { Customer } from "../../customers/entities/customer.entity";
import { Bill } from "../../bills/entities/bill.entity";

@Entity('meter_readings')
@Unique(['customerId', 'period'])  // 1 customer, 1 period only
export class MeterReading {
    @ApiProperty({ example: 1 })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ example: 1 })
    @Column({ name: 'customer_id' })
    customerId: number;

    @ManyToOne(() => Customer, (customer) => customer.meterReadings)
    @JoinColumn({ name: 'customer_id' })
    customer: Customer;

    @ApiProperty({ example: '2025-01' })
    @Column()
    period: string;

    @ApiProperty({ example: 150 })
    @Column({ name: 'meter_start', default: 0 })
    meterStart: number;

    @ApiProperty({ example: 195 })
    @Column({ name: 'meter_end' })
    meterEnd: number;

    @ApiProperty({ example: 45 })
    @Column({ default: 0 })
    usage: number;

    @OneToOne(() => Bill, (bill) => bill.meterReading)
    bill: Bill;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt: Date;
}
