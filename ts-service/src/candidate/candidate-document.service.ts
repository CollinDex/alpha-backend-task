import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { AuthUser } from '../auth/auth.types';
import { CandidateDocument } from '../entities/candidate-document.entity';
import { CreateCandidateDocumentDto } from './dto/create-candidate-document.dto';

@Injectable()
export class CandidateDocumentService {
  constructor(
    @InjectRepository(CandidateDocument)
    private readonly documentRepository: Repository<CandidateDocument>,
  ) {}

  async createDocument(
    user: AuthUser,
    candidateId: string,
    dto: CreateCandidateDocumentDto,
  ): Promise<CandidateDocument> {
    const storageKey = `candidates/${candidateId}/documents/${randomUUID()}.txt`;

    const document = this.documentRepository.create({
      id: randomUUID(),
      workspaceId: user.workspaceId,
      candidateId,
      documentType: dto.documentType,
      fileName: dto.fileName,
      storageKey,
      rawText: dto.rawText,
    });

    return await this.documentRepository.save(document);
  }

  async getDocument(
    user: AuthUser,
    candidateId: string,
    documentId: string,
  ): Promise<CandidateDocument> {
    const document = await this.documentRepository.findOne({
      where: {
        id: documentId,
        workspaceId: user.workspaceId,
        candidateId,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async getDocumentsByCandidate(
    user: AuthUser,
    candidateId: string,
  ): Promise<CandidateDocument[]> {
    return await this.documentRepository.find({
      where: {
        workspaceId: user.workspaceId,
        candidateId,
      },
      order: { uploadedAt: 'DESC' },
    });
  }

  async getDocumentsRawTextByCandidate(
    user: AuthUser,
    candidateId: string,
  ): Promise<string[]> {
    const documents = await this.getDocumentsByCandidate(user, candidateId);
    return documents.map((doc) => doc.rawText);
  }

  /**
   * Get documents for a candidate without requiring auth context.
   * Used by workers and background jobs.
   */
  async getCandidateDocumentsForWorker(
    workspaceId: string,
    candidateId: string,
  ): Promise<string[]> {
    const documents = await this.documentRepository.find({
      where: {
        workspaceId,
        candidateId,
      },
      order: { uploadedAt: 'DESC' },
    });

    return documents.map((doc) => doc.rawText);
  }
}
