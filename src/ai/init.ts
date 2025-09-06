
'use server';

import { genkit, isConfigured, type GenkitOptions } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { logger } from '@/lib/logger';

let isInitialized = false;

/**
 * Ensures that Genkit is initialized safely and only once, even if called multiple times.
 * Adds verbose logging to trace the initialization process.
 */
export async function dynamicallyInitializeGoogleAI() {
  // isConfigured() is Genkit's built-in check.
  if (!isInitialized && !isConfigured()) {
    logger.info('Attempting to initialize Genkit...');

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.length < 10) {
      logger.error('CRITICAL: GEMINI_API_KEY is not set or is invalid. Genkit will not be initialized.');
      // Stop further execution if the key is missing.
      return;
    }

    const genkitOptions: GenkitOptions = {
      plugins: [
        googleAI({
          apiKey: process.env.GEMINI_API_KEY,
        }),
      ],
      logLevel: 'debug', // Set log level to debug for maximum verbosity.
      enableTracingAndMetrics: true, // Enable for more detailed operational tracing.
    };

    try {
      genkit(genkitOptions);
      isInitialized = true;
      logger.info('Genkit initialized successfully.');
    } catch (error) {
      logger.error('CRITICAL: An error occurred during Genkit initialization:', error);
    }

  } else {
    logger.info('Genkit is already configured. Skipping initialization.');
  }
}
