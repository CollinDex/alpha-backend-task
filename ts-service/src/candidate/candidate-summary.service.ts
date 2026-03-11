import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { AuthUser } from '../auth/auth.types';
import { CandidateSummary, SummaryStatus, RecommendedDecision } from '../entities/candidate-summary.entity';

@Injectable()
export class CandidateSummaryService {
  constructor(
    @InjectRepository(CandidateSummary)
    private readonly summaryRepository: Repository<CandidateSummary>,
  ) {}

  async createPendingSummary(user: AuthUser, candidateId: string): Promise<CandidateSummary> {
    const summary = this.summaryRepository.create({
      id: randomUUID(),
      workspaceId: user.workspaceId,
      candidateId,
      statusType: 'pending' as SummaryStatus,
      provider: null,
      promptVersion: 'v1',
    });

    return await this.summaryRepository.save(summary);
  }

  async getSummary(
    user: AuthUser,
    candidateId: string,
    summaryId: string,
  ): Promise<CandidateSummary> {
    const summary = await this.summaryRepository.findOne({
      where: {
        id: summaryId,
        workspaceId: user.workspaceId,
        candidateId,
      },
    });

    if (!summary) {
      throw new NotFoundException('Summary not found');
    }

    return summary;
  }

  async listSummariesByCandidate(
    user: AuthUser,
    candidateId: string,
  ): Promise<CandidateSummary[]> {
    return await this.summaryRepository.find({
      where: {
        workspaceId: user.workspaceId,
        candidateId,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async updateSummarySuccess(
    summaryId: string,
    score: number,
    strengths: string[],
    concerns: string[],
    summary: string,
    recommendedDecision: RecommendedDecision,
    provider: string,
  ): Promise<CandidateSummary> {
    const record = await this.summaryRepository.findOne({ where: { id: summaryId } });
    if (!record) {
      throw new NotFoundException('Summary not found');
    }

    record.statusType = 'completed' as SummaryStatus;
    record.score = score;
    record.strengths = strengths;
    record.concerns = concerns;
    record.summary = summary;
    record.recommendedDecision = recommendedDecision;
    record.provider = provider;

    return await this.summaryRepository.save(record);
  }

  async updateSummaryError(
    summaryId: string,
    errorMessage: string,
  ): Promise<CandidateSummary> {
    const record = await this.summaryRepository.findOne({ where: { id: summaryId } });
    if (!record) {
      throw new NotFoundException('Summary not found');
    }

    record.statusType = 'failed' as SummaryStatus;
    record.errorMessage = errorMessage;

    return await this.summaryRepository.save(record);
  }

  async getPendingSummaries(): Promise<CandidateSummary[]> {
    return await this.summaryRepository.find({
      where: { statusType: 'pending' as SummaryStatus },
      order: { createdAt: 'ASC' },
    });
  }
}
