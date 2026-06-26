import type { CreateJobInput } from '../contracts/job.js';

declare global {
  namespace Express {
    interface Request {
      rawBody?: string;
      requestId?: string;
      authenticatedClient?: {
        type: 'api-key' | 'hmac';
        keyId?: string;
      };
      parsedCreateJobBody?: CreateJobInput;
    }
  }
}

export {};
