import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { AuthUser } from '../auth/auth.types';
import { FakeAuthGuard } from '../auth/fake-auth.guard';
import { CurrentUser } from '../auth/auth-user.decorator';
import { CandidateSummaryService } from './candidate-summary.service';
import { CandidateDocumentService } from './candidate-document.service';
import { QueueService } from '../queue/queue.service';
import {
  RequestCandidateSummaryDto,
  CandidateSummaryResponseDto,
} from './dto/request-candidate-summary.dto';

export interface SummaryGenerationJob {
  summaryId: string;
  candidateId: string;
  workspaceId: string;
}

@Controller('candidates/:candidateId/summaries')
@UseGuards(FakeAuthGuard)
export class CandidateSummaryController {
  constructor(
    private readonly summaryService: CandidateSummaryService,
    private readonly documentService: CandidateDocumentService,
    private readonly queueService: QueueService,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestSummaryGeneration(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
    @Body() _dto: RequestCandidateSummaryDto,
  ): Promise<{ statusCode: number; message: string; summaryId: string }> {
    // Create a pending summary record
    const summary = await this.summaryService.createPendingSummary(user, candidateId);

    // Enqueue the background job
    const job: SummaryGenerationJob = {
      summaryId: summary.id,
      candidateId,
      workspaceId: user.workspaceId,
    };

    this.queueService.enqueue('generate-candidate-summary', job);

    return {
      statusCode: 202,
      message: 'Summary generation enqueued',
      summaryId: summary.id,
    };
  }

  @Get()
  async listSummaries(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
  ): Promise<CandidateSummaryResponseDto[]> {
    const summaries = await this.summaryService.listSummariesByCandidate(user, candidateId);
    return summaries.map((s) => this.mapToResponse(s));
  }

  @Get(':summaryId')
  async getSummary(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
    @Param('summaryId') summaryId: string,
  ): Promise<CandidateSummaryResponseDto> {
    const summary = await this.summaryService.getSummary(user, candidateId, summaryId);
    return this.mapToResponse(summary);
  }

  private mapToResponse(summary: any): CandidateSummaryResponseDto {
    return {
      id: summary.id,
      candidateId: summary.candidateId,
      statusType: summary.statusType,
      score: summary.score,
      strengths: summary.strengths || [],
      concerns: summary.concerns || [],
      summary: summary.summary,
      recommendedDecision: summary.recommendedDecision,
      provider: summary.provider,
      promptVersion: summary.promptVersion,
      errorMessage: summary.errorMessage,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
    };
  }
}
