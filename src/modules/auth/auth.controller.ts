import { Controller, Post, Get, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserRole } from './entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login to get JWT token' })
    @ApiBody({ type: LoginDto })
    async login(@Body() dto: LoginDto, @Req() req: Request) {
        const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
        return this.authService.login(dto, ipAddress);
    }

    @Post('register')
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Register new user (Admin only)' })
    @ApiBody({ type: RegisterDto })
    async register(
        @Body() dto: RegisterDto,
        @CurrentUser() user: any,
        @Req() req: Request,
    ) {
        const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
        return this.authService.register(dto, user?.username, ipAddress);
    }

    @Get('profile')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user profile' })
    async getProfile(@CurrentUser() user: any) {
        return this.authService.getProfile(user.id);
    }

    @Get('users')
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all users (Admin only)' })
    async findAllUsers() {
        return this.authService.findAllUsers();
    }
}
