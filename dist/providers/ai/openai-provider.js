import OpenAI from 'openai';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
export class OpenAiJsonProvider {
    providerName = 'openai';
    modelName;
    client;
    constructor(apiKey, modelName = env.OPENAI_MODEL) {
        this.modelName = modelName;
        this.client = new OpenAI({ apiKey, timeout: env.OPENAI_REQUEST_TIMEOUT_MS });
    }
    async generateJson(input) {
        try {
            const completion = await this.client.chat.completions.create({
                model: this.modelName,
                temperature: input.temperature ?? 0.4,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: `${input.system}\n\nReturn only valid JSON matching this logical schema: ${input.schemaName}. Do not include markdown.`,
                    },
                    { role: 'user', content: input.user },
                ],
            });
            const content = completion.choices[0]?.message?.content;
            if (!content)
                throw new Error('OpenAI returned an empty response.');
            const parsed = JSON.parse(content);
            return {
                output: parsed,
                provider: this.providerName,
                model: this.modelName,
                tokenUsage: {
                    promptTokens: completion.usage?.prompt_tokens,
                    completionTokens: completion.usage?.completion_tokens,
                    totalTokens: completion.usage?.total_tokens,
                },
                warnings: [],
            };
        }
        catch (error) {
            logger.warn({ error, schemaName: input.schemaName }, 'AI generation failed; falling back to deterministic template');
            return {
                output: input.fallback,
                provider: this.providerName,
                model: this.modelName,
                warnings: ['AI generation failed; deterministic fallback output was used.'],
            };
        }
    }
}
