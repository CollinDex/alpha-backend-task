import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  CandidateSummaryInput,
  CandidateSummaryResult,
  SummarizationProvider,
} from './summarization-provider.interface';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

@Injectable()
export class GeminiSummarizationProvider implements SummarizationProvider {
  private readonly logger = new Logger(GeminiSummarizationProvider.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
  }

  async generateCandidateSummary(
    input: CandidateSummaryInput,
  ): Promise<CandidateSummaryResult> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const prompt = this.buildPrompt(input);

    try {
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Gemini API error: ${error}`);
        throw new Error(`Gemini API returned ${response.status}: ${error}`);
      }

      const data: GeminiResponse = await response.json();

      if (!data.candidates || !data.candidates[0]) {
        throw new Error('Invalid response from Gemini API');
      }

      const responseText = data.candidates[0].content.parts[0].text;
      return this.parseGeminiResponse(responseText);
    } catch (error) {
      this.logger.error(`Failed to generate summary: ${error}`);
      throw error;
    }
  }

  private buildPrompt(input: CandidateSummaryInput): string {
    const documentsText = input.documents
      .map((doc, idx) => `Document ${idx + 1}:\n${doc}`)
      .join('\n\n---\n\n');

    return `You are an expert recruiter analyzing candidate documents. Based on the provided documents, generate a structured JSON response with the following format:

{
  "score": <integer from  0-100>,
  "strengths": [<array of 3-5 key strengths>],
  "concerns": [<array of 2-4 key concerns>],
  "summary": "<2-3 sentence summary of the candidate>",
  "recommendedDecision": "<one of: 'advance', 'hold', 'reject'>"
}

Guidelines:
- score: Overall fit for a software engineering role (0-100)
- strengths: Key technical skills, experiences, or qualifications
- concerns: Any gaps, red flags, or areas needing clarification
- summary: Concise 2-3 sentence overview
- recommendedDecision: 'advance' (strong fit), 'hold' (review again), or 'reject' (not a fit)

Candidate documents:
${documentsText}

Return ONLY valid JSON, no additional text or markdown formatting.`;
  }

  private parseGeminiResponse(responseText: string): CandidateSummaryResult {
    try {
      // Remove markdown code blocks if present
      let jsonText = responseText.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }
      jsonText = jsonText.trim();

      const parsed = JSON.parse(jsonText);

      // Validate required fields
      if (
        typeof parsed.score !== 'number' ||
        !Array.isArray(parsed.strengths) ||
        !Array.isArray(parsed.concerns) ||
        typeof parsed.summary !== 'string' ||
        !['advance', 'hold', 'reject'].includes(parsed.recommendedDecision)
      ) {
        throw new Error('Invalid response schema from Gemini');
      }

      return {
        score: Math.max(0, Math.min(100, parsed.score)),
        strengths: parsed.strengths.slice(0, 5),
        concerns: parsed.concerns.slice(0, 4),
        summary: parsed.summary,
        recommendedDecision: parsed.recommendedDecision as 'advance' | 'hold' | 'reject',
      };
    } catch (error) {
      this.logger.error(`Failed to parse Gemini response: ${error}`);
      throw new Error(`Failed to parse LLM response: ${error}`);
    }
  }
}
