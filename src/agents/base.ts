import type { CreateArtifactInput } from '../contracts/artifacts.js';
import type { JobType } from '../contracts/job.js';
import type { SwarmJobDocument } from '../models/job.model.js';

export interface AgentExecutionResult {
  artifact: CreateArtifactInput;
  tokenUsage?: Record<string, unknown>;
  costEstimate?: Record<string, unknown>;
  warnings?: string[];
}

export interface SwarmAgent {
  readonly name: string;
  readonly version: string;
  supports(jobType: JobType): boolean;
  run(job: SwarmJobDocument): Promise<AgentExecutionResult>;
}

export function getString(input: Record<string, unknown>, key: string, fallback = ''): string {
  const value = input[key];
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);
  return fallback;
}

export function getStringArray(input: Record<string, unknown>, key: string): string[] {
  const value = input[key];
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

export function coerceRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
