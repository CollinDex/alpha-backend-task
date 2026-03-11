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
import { CandidateDocumentService } from './candidate-document.service';
import { CreateCandidateDocumentDto, CandidateDocumentResponseDto } from './dto/create-candidate-document.dto';

@Controller('candidates/:candidateId/documents')
@UseGuards(FakeAuthGuard)
export class CandidateDocumentController {
  constructor(private readonly documentService: CandidateDocumentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async uploadDocument(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
    @Body() dto: CreateCandidateDocumentDto,
  ): Promise<CandidateDocumentResponseDto> {
    const document = await this.documentService.createDocument(user, candidateId, dto);
    return this.mapToResponse(document);
  }

  @Get()
  async listDocuments(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
  ): Promise<CandidateDocumentResponseDto[]> {
    const documents = await this.documentService.getDocumentsByCandidate(user, candidateId);
    return documents.map((doc) => this.mapToResponse(doc));
  }

  private mapToResponse(document: any): CandidateDocumentResponseDto {
    return {
      id: document.id,
      candidateId: document.candidateId,
      documentType: document.documentType,
      fileName: document.fileName,
      storageKey: document.storageKey,
      uploadedAt: document.uploadedAt,
    };
  }
}
