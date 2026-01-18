import { Module } from '@nestjs/common';
import { AffordabilityService } from './affordability.service';

@Module({
  providers: [AffordabilityService],
  exports: [AffordabilityService]
})
export class ScoringModule {}
