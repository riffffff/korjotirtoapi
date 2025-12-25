import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

export interface CreateAuditLogDto {
    action: AuditAction;
    entityType: string;
    entityId?: number;
    performedBy?: string;
    ipAddress?: string;
    details?: Record<string, any>;
    description?: string;
}

@Injectable()
export class AuditLogsService {
    constructor(
        @InjectRepository(AuditLog)
        private auditLogRepository: Repository<AuditLog>,
    ) { }

    async log(dto: CreateAuditLogDto): Promise<AuditLog> {
        const auditLog = this.auditLogRepository.create({
            ...dto,
            performedBy: dto.performedBy || 'System',
        });
        return this.auditLogRepository.save(auditLog);
    }

    async findAll(page = 1, limit = 20) {
        const [data, total] = await this.auditLogRepository.findAndCount({
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            data,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    async findByEntity(entityType: string, entityId: number) {
        return this.auditLogRepository.find({
            where: { entityType, entityId },
            order: { createdAt: 'DESC' },
        });
    }
}
