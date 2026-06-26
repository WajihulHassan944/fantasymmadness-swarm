import { env } from '../../config/env.js';
import { DeterministicAiProvider } from './deterministic-provider.js';
import { OpenAiJsonProvider } from './openai-provider.js';
import type { AiProvider } from './ai-provider.js';

let provider: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (provider) return provider;
  if (env.OPENAI_API_KEY && !env.OPENAI_DISABLED) {
    provider = new OpenAiJsonProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL);
  } else {
    provider = new DeterministicAiProvider();
  }
  return provider;
}

export function setAiProviderForTests(nextProvider: AiProvider | null): void {
  provider = nextProvider;
}
