import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CandidateDocument } from '../entities/candidate-document.entity';
import { CandidateSummary } from '../entities/candidate-summary.entity';
import { QueueModule } from '../queue/queue.module';
import { LlmModule } from '../llm/llm.module';
import { CandidateDocumentService } from './candidate-document.service';
import { CandidateSummaryService } from './candidate-summary.service';
import { CandidateDocumentController } from './candidate-document.controller';
import { CandidateSummaryController } from './candidate-summary.controller';
import { CandidateSummaryWorkerService } from './candidate-summary-worker.service';
import { BackgroundJobProcessorService } from './background-job-processor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CandidateDocument, CandidateSummary]),
    QueueModule,
    LlmModule,
  ],
  providers: [
    CandidateDocumentService,
    CandidateSummaryService,
    CandidateSummaryWorkerService,
    BackgroundJobProcessorService,
  ],
  controllers: [CandidateDocumentController, CandidateSummaryController],
  exports: [
    CandidateDocumentService,
    CandidateSummaryService,
    BackgroundJobProcessorService,
  ],
})
export class CandidateModule {}
