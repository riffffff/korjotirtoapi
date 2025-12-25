import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsBoolean, IsOptional, Min } from "class-validator";

export class PayBillDto {
    @ApiProperty({ description: 'Amount paid by customer', example: 70000 })
    @IsNumber({}, { message: 'amountPaid must be a number' })
    @IsNotEmpty({ message: 'amountPaid is required' })
    @Min(1, { message: 'amountPaid must be greater than 0' })
    amountPaid: number;

    @ApiProperty({ description: 'Apply penalty Rp 5000?', example: false, required: false })
    @IsBoolean({ message: 'hasPenalty must be a boolean (true/false)' })
    @IsOptional()
    hasPenalty?: boolean;
}
