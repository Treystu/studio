
'use server';

import {config} from 'dotenv';
config();

import {genkit, type GenkitOptions} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {defineFlow} from 'genkit';

// In dev, we can initialize with a key for easier local testing.
// In production, the apiKey will be passed into each flow dynamically.
const genkitOptions: GenkitOptions = {
  plugins: [googleAI({apiKey: process.env.GEMINI_API_KEY})],
  logLevel: 'debug',
};

genkit(genkitOptions);

// Define a simple flow to test the API key
defineFlow(
  {
    name: 'helloFlow',
  },
  async () => {
    console.log('helloFlow was called');
    return {hello: 'world'};
  }
);

// We still need to import the other flows so they are registered.
import '@/ai/flows/display-alerts-for-data-deviations.ts';
import '@/ai/flows/extract-data-from-bms-image.ts';
import '@/ai/flows/summarize-battery-health.ts';
import '@/ai/flows/generate-alert-summary.ts';
