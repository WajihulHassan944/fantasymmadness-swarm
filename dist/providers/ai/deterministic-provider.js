export class DeterministicAiProvider {
    providerName = 'deterministic';
    modelName = 'local-template';
    async generateJson(input) {
        return {
            output: input.fallback,
            provider: this.providerName,
            model: this.modelName,
            warnings: ['OPENAI_API_KEY was not configured or AI was disabled; deterministic template output was used.'],
        };
    }
}
