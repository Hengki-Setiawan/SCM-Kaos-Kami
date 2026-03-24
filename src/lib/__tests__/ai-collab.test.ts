import { pipeline, verify } from '../ai-collab';

// Mock dependencies
jest.mock('../groq-cascade', () => ({
  cascadeChat: jest.fn().mockImplementation(async (options) => {
    if (options.messages[options.messages.length - 1].content.includes('SIMULATE_GROQ_FAILURE')) {
      throw new Error('Groq Cascade Failing Entirely');
    }
    return {
      result: { choices: [{ message: { content: '{"action":"CHAT"}' } }] },
      model: 'llama-mock'
    };
  })
}));

jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: jest.fn().mockImplementation(async (options) => {
            const prompt = options.contents[options.contents.length - 1].parts[0].text;
            if (prompt.includes('SIMULATE_GEMINI_FAILURE')) {
              throw new Error('RESOURCE_EXHAUSTED');
            }
            if (options.model === 'gemini-2.5-flash-lite') {
                return { text: JSON.stringify({ approved: true, warning: 'Aman' }) };
            }
            return { text: 'Gemini Response' };
          })
        }
      };
    })
  };
});

describe('AI Pipeline Collaboration', () => {
  it('should successfully run the pipeline (Groq parse -> Gemini respond)', async () => {
    const res = await pipeline({
      userMessage: 'Cek stok kaos hitam',
      systemPrompt: 'System',
    });
    
    expect(res.mode).toBe('groq→gemini');
    expect(res.content).toBe('Gemini Response');
  });

  it('should gracefully degrade to Groq solo when Gemini fails', async () => {
    const res = await pipeline({
      userMessage: 'SIMULATE_GEMINI_FAILURE Cek stok kaos hitam',
      systemPrompt: 'System',
    });
    
    // mode will be groq-solo-llama-mock
    expect(res.mode).toContain('groq-solo');
  });

  it('should return an error when both Groq and Gemini entirely fail', async () => {
    const res = await pipeline({
      userMessage: 'SIMULATE_GEMINI_FAILURE SIMULATE_GROQ_FAILURE',
      systemPrompt: 'System',
    });
    
    expect(res.mode).toBe('error');
    expect(res.content).toContain('sibuk');
  });
});

describe('AI Verify System', () => {
  it('should verify a valid action', async () => {
    const check = await verify({ action: 'DEDUCT_STOCK' }, { currentStock: 10 }, 'Kurang 5');
    expect(check.approved).toBe(true);
    expect(check.warning).toBe('Aman');
  });

  it('should auto-approve action if Gemini fails (fail-open for UX continuity)', async () => {
    const check = await verify({ action: 'DEDUCT_STOCK' }, { currentStock: 10 }, 'SIMULATE_GEMINI_FAILURE');
    expect(check.approved).toBe(true);
    expect(check.warning).toBeNull();
  });
});
