
'use server';

import { ai } from '@/ai/genkit';
import { logger } from '@/lib/logger';

let googleAI: any = null;

export async function dynamicallyInitializeGoogleAI() {
  if (googleAI) {
    logger.info('Google AI plugin already initialized.');
    return;
  }

  logger.info('Dynamically initializing Google AI plugin...');

  // Log to check if the API key is present
  if (process.env.GEMINI_API_KEY) {
    logger.info('GEMINI_API_KEY is found in the environment.');
  } else {
    logger.error('CRITICAL: GEMINI_API_KEY is NOT FOUND in the environment.');
  }

  try {
    const { googleAI: googleAIFactory } = await import('@genkit-ai/googleai');
    googleAI = googleAIFactory({
      apiKey: process.env.GEMINI_API_KEY,
    });

    ai.configure({
      plugins: [googleAI],
      logLevel: 'debug',
      enableTracingAndMetrics: true,
    });
    logger.info('Google AI plugin configured.');
  } catch (e) {
    logger.error('Failed to initialize or configure Google AI plugin', e);
    throw e; // Rethrow to see the error in the main log
  }
}
