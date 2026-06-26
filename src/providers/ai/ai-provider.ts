export interface AiGenerateJsonInput<TFallback extends Record<string, unknown>> {
  system: string;
  user: string;
  schemaName: string;
  fallback: TFallback;
  temperature?: number;
}

export interface AiGenerateJsonResult<T extends Record<string, unknown>> {
  output: T;
  provider: string;
  model: string;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  warnings: string[];
}

export interface AiProvider {
  readonly providerName: string;
  readonly modelName: string;
  generateJson<T extends Record<string, unknown>>(input: AiGenerateJsonInput<T>): Promise<AiGenerateJsonResult<T>>;
}
