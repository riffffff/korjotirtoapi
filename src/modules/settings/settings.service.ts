import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingsService implements OnModuleInit {
    private readonly DEFAULT_SETTINGS = [
        { key: 'RATE_K1', value: '1200', description: 'Rate per m³ for K1 (≤ limit)' },
        { key: 'RATE_K2', value: '3000', description: 'Rate per m³ for K2 (> limit)' },
        { key: 'LIMIT_K1', value: '40', description: 'K1 usage limit in m³' },
        { key: 'ADMIN_FEE', value: '3000', description: 'Monthly admin fee' },
        { key: 'PENALTY_AMOUNT', value: '5000', description: 'Penalty amount for late payment' },
    ];

    constructor(
        @InjectRepository(Setting)
        private settingRepository: Repository<Setting>,
    ) { }

    async onModuleInit() {
        for (const setting of this.DEFAULT_SETTINGS) {
            const exists = await this.settingRepository.findOne({ where: { key: setting.key } });
            if (!exists) {
                await this.settingRepository.save(setting);
            }
        }
    }

    async findAll() {
        const settings = await this.settingRepository.find({ order: { key: 'ASC' } });
        return settings.map(s => ({ key: s.key, value: s.value, description: s.description }));
    }

    async getValue(key: string): Promise<number> {
        const setting = await this.settingRepository.findOne({ where: { key } });
        if (!setting) throw new NotFoundException(`Setting ${key} not found`);
        return Number(setting.value);
    }

    async update(key: string, dto: UpdateSettingDto) {
        const setting = await this.settingRepository.findOne({ where: { key } });
        if (!setting) throw new NotFoundException(`Setting ${key} not found`);
        setting.value = dto.value;
        await this.settingRepository.save(setting);
        return { key: setting.key, value: setting.value, description: setting.description };
    }

    async getCurrentRates() {
        return {
            rateK1: await this.getValue('RATE_K1'),
            rateK2: await this.getValue('RATE_K2'),
            limitK1: await this.getValue('LIMIT_K1'),
            adminFee: await this.getValue('ADMIN_FEE'),
        };
    }
}
