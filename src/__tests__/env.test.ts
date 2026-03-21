import { describe, it, expect } from 'vitest';
import { validateEnv } from '../lib/env';

describe('Environment Validation', () => {
  it('should throw error if required vars are missing', () => {
    // Save original env
    const originalEnv = process.env;
    process.env = { ...originalEnv };
    delete (process.env as any).GROQ_API_KEY;

    expect(() => validateEnv()).toThrow();

    // Restore
    process.env = originalEnv;
  });
});
