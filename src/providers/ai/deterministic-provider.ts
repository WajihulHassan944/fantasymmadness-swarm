import type { AiGenerateJsonInput, AiGenerateJsonResult, AiProvider } from './ai-provider.js';

export class DeterministicAiProvider implements AiProvider {
  readonly providerName = 'deterministic';
  readonly modelName = 'local-template';

  async generateJson<T extends Record<string, unknown>>(input: AiGenerateJsonInput<T>): Promise<AiGenerateJsonResult<T>> {
    return {
      output: input.fallback,
      provider: this.providerName,
      model: this.modelName,
      warnings: ['OPENAI_API_KEY was not configured or AI was disabled; deterministic template output was used.'],
    };
  }
}
