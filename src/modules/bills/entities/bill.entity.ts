import { ApiProperty } from "@nestjs/swagger";
import { Column, Entity, PrimaryGeneratedColumn, OneToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { MeterReading } from "../../meter-readings/entities/meter-reading.entity";
import { BillItem } from "./bill-item.entity";

@Entity('bills')
export class Bill {
    @ApiProperty({ example: 1 })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ example: 1 })
    @Column({ name: 'meter_reading_id' })
    meterReadingId: number;

    @OneToOne(() => MeterReading, (reading) => reading.bill)
    @JoinColumn({ name: 'meter_reading_id' })
    meterReading: MeterReading;

    @ApiProperty({ example: 63000, description: 'Bill total before penalty' })
    @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
    totalAmount: number;

    @ApiProperty({ example: 'pending', enum: ['pending', 'partial', 'paid'] })
    @Column({ name: 'payment_status', default: 'pending' })
    paymentStatus: string;

    @ApiProperty({ example: 5000, description: 'Penalty applied when paying' })
    @Column({ name: 'penalty', type: 'decimal', precision: 12, scale: 2, default: 0 })
    penalty: number;

    @ApiProperty({ example: 70000, description: 'Total amount paid by customer' })
    @Column({ name: 'amount_paid', type: 'decimal', precision: 12, scale: 2, default: 0 })
    amountPaid: number;

    @ApiProperty({ example: 5000, description: 'Remaining debt (unpaid amount)' })
    @Column({ name: 'remaining', type: 'decimal', precision: 12, scale: 2, default: 0 })
    remaining: number;

    @ApiProperty({ example: 2000, description: 'Change returned' })
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    change: number;

    @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
    paidAt: Date;

    @OneToMany(() => BillItem, (item) => item.bill, { cascade: true })
    items: BillItem[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
