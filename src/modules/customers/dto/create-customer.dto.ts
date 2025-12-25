import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString, Min, MinLength } from "class-validator";

export class CreateCustomerDto {
    @ApiProperty({ description: 'Customer name', example: 'Budi Santoso' })
    @IsString({ message: 'name must be a string' })
    @IsNotEmpty({ message: 'name is required' })
    @MinLength(2, { message: 'name must be at least 2 characters' })
    name: string;

    @ApiProperty({ description: 'Customer number', example: 1001 })
    @IsNumber({}, { message: 'customerNumber must be a number' })
    @IsNotEmpty({ message: 'customerNumber is required' })
    @Min(1, { message: 'customerNumber must be greater than 0' })
    customerNumber: number;
}
