import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class LoginDto {
    @ApiProperty({ example: 'admin' })
    @IsString()
    @IsNotEmpty({ message: 'username is required' })
    username: string;

    @ApiProperty({ example: 'admin123' })
    @IsString()
    @IsNotEmpty({ message: 'password is required' })
    @MinLength(6, { message: 'password must be at least 6 characters' })
    password: string;
}
