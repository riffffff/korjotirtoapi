import { Test, TestingModule } from '@nestjs/testing';
import { MeterReadingsController } from './meter-readings.controller';
import { MeterReadingsService } from './meter-readings.service';

describe('MeterReadingsController', () => {
  let controller: MeterReadingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeterReadingsController],
      providers: [MeterReadingsService],
    }).compile();

    controller = module.get<MeterReadingsController>(MeterReadingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
