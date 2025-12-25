import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";
import { UserRole } from "../entities/user.entity";

export class RegisterDto {
    @ApiProperty({ example: 'operator1' })
    @IsString()
    @IsNotEmpty({ message: 'username is required' })
    @MinLength(3, { message: 'username must be at least 3 characters' })
    username: string;

    @ApiProperty({ example: 'password123' })
    @IsString()
    @IsNotEmpty({ message: 'password is required' })
    @MinLength(6, { message: 'password must be at least 6 characters' })
    password: string;

    @ApiProperty({ example: 'Operator User' })
    @IsString()
    @IsNotEmpty({ message: 'name is required' })
    name: string;

    @ApiProperty({ example: 'operator', enum: UserRole, required: false })
    @IsOptional()
    @IsEnum(UserRole, { message: 'role must be admin, operator, or viewer' })
    role?: UserRole;
}
