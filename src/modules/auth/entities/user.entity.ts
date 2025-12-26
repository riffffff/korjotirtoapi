import { ApiProperty } from "@nestjs/swagger";
import { Exclude } from "class-transformer";
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export enum UserRole {
    ADMIN = 'admin',
}

@Entity('users')
export class User {
    @ApiProperty({ example: 1 })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ example: 'admin' })
    @Column({ unique: true })
    username: string;

    @Exclude()
    @Column()
    password: string;

    @ApiProperty({ example: 'Admin User' })
    @Column()
    name: string;

    @ApiProperty({ example: 'admin', enum: UserRole })
    @Column({ type: 'varchar', default: UserRole.ADMIN })
    role: UserRole;

    @ApiProperty({ example: true })
    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
