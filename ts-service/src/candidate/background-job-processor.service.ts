import { Injectable, Logger } from '@nestjs/common';

import { QueueService } from '../queue/queue.service';
import { CandidateSummaryWorkerService } from './candidate-summary-worker.service';
import { SummaryGenerationJob } from './candidate-summary.controller';

/**
 * Background job processor service.
 * In production, this would run in a separate worker process or use a real queue (Redis, RabbitMQ, etc.).
 * For this assessment, we simulate async processing by providing a method to process enqueued jobs.
 */
@Injectable()
export class BackgroundJobProcessorService {
  private readonly logger = new Logger(BackgroundJobProcessorService.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly summaryWorker: CandidateSummaryWorkerService,
  ) {}

  /**
   * Process all pending jobs in the queue.
   * In a real system, this would run continuously in a separate process.
   */
  async processPendingJobs(): Promise<void> {
    const jobs = this.queueService.getQueuedJobs();

    for (const job of jobs) {
      if (job.name === 'generate-candidate-summary') {
        try {
          const payload = job.payload as SummaryGenerationJob;
          await this.summaryWorker.processSummaryGenerationJob(payload);
        } catch (error) {
          this.logger.error(`Failed to process job ${job.id}: ${error}`);
        }
      }
    }
  }

  /**
   * Process a specific job by ID.
   */
  async processJobById(jobId: string): Promise<void> {
    const jobs = this.queueService.getQueuedJobs();
    const job = jobs.find((j) => j.id === jobId);

    if (!job) {
      this.logger.warn(`Job ${jobId} not found in queue`);
      return;
    }

    if (job.name === 'generate-candidate-summary') {
      const payload = job.payload as SummaryGenerationJob;
      await this.summaryWorker.processSummaryGenerationJob(payload);
    }
  }
}
