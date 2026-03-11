import { IsOptional } from 'class-validator';

export class RequestCandidateSummaryDto {
  // Request body is minimal - just a trigger to enqueue the job
  @IsOptional()
  skipIfExists?: boolean;
}

export class CandidateSummaryResponseDto {
  id!: string;
  candidateId!: string;
  statusType!: 'pending' | 'completed' | 'failed';
  score!: number | null;
  strengths!: string[];
  concerns!: string[];
  summary!: string | null;
  recommendedDecision!: 'advance' | 'hold' | 'reject' | null;
  provider!: string | null;
  promptVersion!: string | null;
  errorMessage!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
