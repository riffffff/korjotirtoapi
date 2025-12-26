import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
    constructor(private readonly service: SettingsService) { }

    @Get()
    @Public()
    @ApiOperation({ summary: 'Lihat semua pengaturan tarif' })
    findAll() {
        return this.service.findAll();
    }

    @Patch(':key')
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Update tarif (Admin only)' })
    update(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
        return this.service.update(key, dto);
    }
}
