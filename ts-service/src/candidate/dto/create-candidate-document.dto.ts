import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCandidateDocumentDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  documentType!: string; // 'resume', 'cover_letter', 'transcript', etc.

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  rawText!: string;
}

export class CandidateDocumentResponseDto {
  id!: string;
  candidateId!: string;
  documentType!: string;
  fileName!: string;
  storageKey!: string;
  uploadedAt!: Date;
}
