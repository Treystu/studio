
import { googleAI } from '@genkit-ai/googleai';
import { GenkitOptions } from 'genkit';
import { logger } from '@/lib/logger';

// A map to track which plugins have been initialized
const initializedPlugins = new Map<string, boolean>();

/**
 * Dynamically initializes the Google AI plugin if it hasn't been already.
 * This is to avoid build-time errors and to only initialize it when needed.
 */
export function dynamicallyInitializeGoogleAI() {
  const pluginName = 'googleAI';
  if (initializedPlugins.has(pluginName)) {
    return;
  }

  logger.info('Dynamically initializing Google AI plugin...');
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error('GEMINI_API_KEY environment variable not found.');
    throw new Error('GEMINI_API_KEY environment variable not set. The API key is required to use Google AI models.');
  }

  const genkitOptions: GenkitOptions = {
    plugins: [googleAI({ apiKey })],
  };

  // We are not calling genkit() here because it's already been called in genkit.ts
  // We are just adding the plugin to the existing configuration
  // This is a bit of a hack, but it's necessary to avoid re-initializing everything
  // @ts-ignore - We are accessing a private property to add the plugin
  global.__genkitPluginRegistry?.register(pluginName, genkitOptions.plugins[0]);

  initializedPlugins.set(pluginName, true);
  logger.info('Google AI plugin initialized.');
}
