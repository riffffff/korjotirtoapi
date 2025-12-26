import { Injectable, UnauthorizedException, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';

@Injectable()
export class AuthService implements OnModuleInit {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private jwtService: JwtService,
        private auditLogsService: AuditLogsService,
    ) { }

    async onModuleInit() {
        // Create default admin user if not exists
        const adminExists = await this.userRepository.findOne({ where: { username: 'admin' } });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await this.userRepository.save({
                username: 'admin',
                password: hashedPassword,
                name: 'Administrator',
                role: UserRole.ADMIN,
            });
            console.log('✓ Default admin user created (username: admin, password: admin123)');
        }
    }

    async register(dto: RegisterDto, performedBy?: string, ipAddress?: string) {
        // Check if username already exists
        const existingUser = await this.userRepository.findOne({ where: { username: dto.username } });
        if (existingUser) {
            throw new ConflictException(`Username "${dto.username}" already exists`);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(dto.password, 10);

        // Create user
        const user = await this.userRepository.save({
            username: dto.username,
            password: hashedPassword,
            name: dto.name,
            role: UserRole.ADMIN,
        });

        // Audit log
        await this.auditLogsService.log({
            action: AuditAction.CREATE,
            entityType: 'users',
            entityId: user.id,
            performedBy: performedBy || 'System',
            ipAddress,
            details: { username: user.username, name: user.name, role: user.role },
            description: `Created user "${user.username}" with role ${user.role}`,
        });

        return {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
        };
    }

    async login(dto: LoginDto, ipAddress?: string) {
        const user = await this.userRepository.findOne({ where: { username: dto.username } });

        if (!user) {
            throw new UnauthorizedException('Invalid username or password');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('User account is inactive');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid username or password');
        }

        const payload = {
            sub: user.id,
            username: user.username,
            role: user.role,
        };

        const accessToken = this.jwtService.sign(payload);

        // Audit log for login
        await this.auditLogsService.log({
            action: AuditAction.CREATE,
            entityType: 'auth_login',
            entityId: user.id,
            performedBy: user.username,
            ipAddress,
            details: { role: user.role },
            description: `User "${user.username}" logged in`,
        });

        return {
            accessToken,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
            },
        };
    }

    async findAllUsers() {
        const users = await this.userRepository.find({
            select: ['id', 'username', 'name', 'role', 'isActive', 'createdAt'],
            order: { createdAt: 'DESC' },
        });
        return users;
    }

    async getProfile(userId: number) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ['id', 'username', 'name', 'role', 'isActive', 'createdAt', 'updatedAt'],
        });
        return user;
    }
}
