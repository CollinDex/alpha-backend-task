import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FakeSummarizationProvider } from './fake-summarization.provider';
import { GeminiSummarizationProvider } from './gemini-summarization.provider';
import { SUMMARIZATION_PROVIDER } from './summarization-provider.interface';

@Module({
  providers: [
    FakeSummarizationProvider,
    GeminiSummarizationProvider,
    {
      provide: SUMMARIZATION_PROVIDER,
      useFactory: (configService: ConfigService) => {
        const useGemini = configService.get<string>('USE_GEMINI_PROVIDER') === 'true';
        const geminiApiKey = configService.get<string>('GEMINI_API_KEY');

        if (useGemini && geminiApiKey) {
          return GeminiSummarizationProvider;
        }

        // Default to fake provider for testing
        return FakeSummarizationProvider;
      },
      inject: [ConfigService],
    },
  ],
  exports: [SUMMARIZATION_PROVIDER, FakeSummarizationProvider, GeminiSummarizationProvider],
})
export class LlmModule {}
