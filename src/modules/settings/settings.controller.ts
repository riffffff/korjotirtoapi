import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Settings')
@ApiBearerAuth('access-token')
@Controller('settings')
export class SettingsController {
    constructor(private readonly service: SettingsService) { }

    @Get()
    @ApiOperation({ summary: 'Lihat semua pengaturan tarif' })
    findAll() {
        return this.service.findAll();
    }

    @Patch(':key')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Update tarif (Admin only)' })
    update(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
        return this.service.update(key, dto);
    }
}
