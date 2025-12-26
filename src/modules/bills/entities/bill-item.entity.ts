import { ApiProperty } from "@nestjs/swagger";
import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from "typeorm";
import { Bill } from "./bill.entity";

@Entity('bill_items')
export class BillItem {
    @ApiProperty({ example: 1 })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ example: 1 })
    @Column({ name: 'bill_id' })
    billId: number;

    @ManyToOne(() => Bill, (bill) => bill.items)
    @JoinColumn({ name: 'bill_id' })
    bill: Bill;

    @ApiProperty({ example: 'K1', enum: ['ADMIN_FEE', 'K1', 'K2'] })
    @Column()
    type: string;

    @ApiProperty({ example: 40 })
    @Column({ default: 0 })
    usage: number;

    @ApiProperty({ example: 1200 })
    @Column({ default: 0 })
    rate: number;

    @ApiProperty({ example: 48000 })
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    amount: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt: Date;
}
