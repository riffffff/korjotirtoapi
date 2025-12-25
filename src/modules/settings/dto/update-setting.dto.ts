import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class UpdateSettingDto {
    @ApiProperty({ description: 'Setting value', example: '1500' })
    @IsString({ message: 'value must be a string' })
    @IsNotEmpty({ message: 'value is required' })
    value: string;
}
