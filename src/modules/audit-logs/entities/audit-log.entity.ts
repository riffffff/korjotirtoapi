import { ApiProperty } from "@nestjs/swagger";
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

export enum AuditAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    PAYMENT = 'PAYMENT',
}

@Entity('audit_logs')
export class AuditLog {
    @ApiProperty({ example: 1 })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ example: 'PAYMENT', enum: AuditAction })
    @Column({ type: 'varchar', length: 50 })
    action: AuditAction;

    @ApiProperty({ example: 'bills' })
    @Column({ name: 'entity_type', type: 'varchar', length: 100 })
    entityType: string;

    @ApiProperty({ example: 1 })
    @Column({ name: 'entity_id', nullable: true })
    entityId: number;

    @ApiProperty({ example: 'Admin' })
    @Column({ name: 'performed_by', type: 'varchar', length: 255, default: 'System' })
    performedBy: string;

    @ApiProperty({ example: '192.168.1.1' })
    @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
    ipAddress: string;

    @ApiProperty({ example: { amountPaid: 50000 } })
    @Column({ type: 'jsonb', nullable: true })
    details: Record<string, any>;

    @ApiProperty({ example: 'Payment of Rp50.000 for bill #1' })
    @Column({ type: 'text', nullable: true })
    description: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
