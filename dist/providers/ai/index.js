import { env } from '../../config/env.js';
import { DeterministicAiProvider } from './deterministic-provider.js';
import { OpenAiJsonProvider } from './openai-provider.js';
let provider = null;
export function getAiProvider() {
    if (provider)
        return provider;
    if (env.OPENAI_API_KEY && !env.OPENAI_DISABLED) {
        provider = new OpenAiJsonProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL);
    }
    else {
        provider = new DeterministicAiProvider();
    }
    return provider;
}
export function setAiProviderForTests(nextProvider) {
    provider = nextProvider;
}
