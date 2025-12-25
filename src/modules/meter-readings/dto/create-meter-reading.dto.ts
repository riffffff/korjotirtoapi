import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString, Matches, Min } from "class-validator";

export class CreateMeterReadingDto {
    @ApiProperty({ description: 'Customer ID', example: 1 })
    @IsNumber({}, { message: 'customerId must be a number' })
    @IsNotEmpty({ message: 'customerId is required' })
    @Min(1, { message: 'customerId must be greater than 0' })
    customerId: number;

    @ApiProperty({ description: 'Current meter reading', example: 195 })
    @IsNumber({}, { message: 'meterEnd must be a number' })
    @IsNotEmpty({ message: 'meterEnd is required' })
    @Min(0, { message: 'meterEnd must be 0 or greater' })
    meterEnd: number;

    @ApiProperty({ description: 'Billing period (format: YYYY-MM)', example: '2025-01' })
    @IsString({ message: 'period must be a string' })
    @IsNotEmpty({ message: 'period is required' })
    @Matches(/^\d{4}-\d{2}$/, { message: 'period format must be YYYY-MM (e.g., 2025-01)' })
    period: string;
}
