import { PartialType } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
    @ApiProperty({
        description: 'Nama Pelanggan', example: 'John Doe Updated'
    })
    name: string;

    @ApiProperty({
        description: 'Nomor Pelanggan', example: 1000
    })
    customerNumber: number;
}
