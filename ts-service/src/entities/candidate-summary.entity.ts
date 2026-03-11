import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { SampleCandidate } from './sample-candidate.entity';
import { SampleWorkspace } from './sample-workspace.entity';

export type SummaryStatus = 'pending' | 'completed' | 'failed';
export type RecommendedDecision = 'advance' | 'hold' | 'reject';

@Entity({ name: 'candidate_summaries' })
@Index(['workspaceId', 'candidateId'])
@Index(['statusType'])
export class CandidateSummary {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ name: 'workspace_id', type: 'varchar', length: 64 })
  workspaceId!: string;

  @Column({ name: 'candidate_id', type: 'varchar', length: 64 })
  candidateId!: string;

  @Column({ name: 'status_type', type: 'varchar', length: 20, default: 'pending' })
  statusType!: SummaryStatus;

  @Column({ type: 'integer', nullable: true })
  score!: number | null;

  @Column({ name: 'strengths', type: 'text', nullable: true })
  strengthsJson!: string | null;

  @Column({ name: 'concerns', type: 'text', nullable: true })
  concernsJson!: string | null;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({
    name: 'recommended_decision',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  recommendedDecision!: RecommendedDecision | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  provider!: string | null;

  @Column({ name: 'prompt_version', type: 'varchar', length: 32, nullable: true })
  promptVersion!: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => SampleWorkspace, (workspace) => workspace.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: SampleWorkspace;

  @ManyToOne(() => SampleCandidate, (candidate) => candidate.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'candidate_id' })
  candidate!: SampleCandidate;

  // Helper methods for JSON serialization
  get strengths(): string[] {
    return this.strengthsJson ? JSON.parse(this.strengthsJson) : [];
  }

  set strengths(value: string[]) {
    this.strengthsJson = JSON.stringify(value);
  }

  get concerns(): string[] {
    return this.concernsJson ? JSON.parse(this.concernsJson) : [];
  }

  set concerns(value: string[]) {
    this.concernsJson = JSON.stringify(value);
  }
}
