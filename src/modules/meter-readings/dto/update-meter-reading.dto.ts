import { PartialType } from '@nestjs/swagger';
import { CreateMeterReadingDto } from './create-meter-reading.dto';

export class UpdateMeterReadingDto extends PartialType(CreateMeterReadingDto) { }
