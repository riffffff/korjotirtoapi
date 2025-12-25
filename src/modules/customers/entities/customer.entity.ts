import { ApiProperty } from "@nestjs/swagger";
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { MeterReading } from "../../meter-readings/entities/meter-reading.entity";

@Entity('customers')
export class Customer {
    @ApiProperty({ example: 1 })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ example: 'Budi Santoso' })
    @Column()
    name: string;

    @ApiProperty({ example: 1001 })
    @Column({ name: 'customer_number' })
    customerNumber: number;

    @ApiProperty({ example: 150000 })
    @Column({ name: 'outstanding_balance', type: 'decimal', precision: 12, scale: 2, default: 0 })
    outstandingBalance: number;

    @OneToMany(() => MeterReading, (reading) => reading.customer)
    meterReadings: MeterReading[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
