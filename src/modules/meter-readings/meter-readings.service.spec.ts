import { Test, TestingModule } from '@nestjs/testing';
import { MeterReadingsService } from './meter-readings.service';

describe('MeterReadingsService', () => {
  let service: MeterReadingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MeterReadingsService],
    }).compile();

    service = module.get<MeterReadingsService>(MeterReadingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
