'use server';

import {config} from 'dotenv';
config();

import {genkit, type GenkitOptions} from 'genkit';
import {googleAI}s from '@genkit-ai/googleai';
import {defineFlow} from 'genkit';

console.log(
  'DEV SERVER: Initializing Genkit in debug mode... GEMINI_API_KEY available on server:',
  !!process.env.GEMINI_API_KEY
);
if (!process.env.GEMINI_API_KEY) {
  console.log(
    'DEV SERVER: GEMINI_API_KEY environment variable is not set on the server.'
  );
}

const genkitOptions: GenkitOptions = {
  plugins: [googleAI()],
  logLevel: 'debug',
  model: 'googleai/gemini-2.5-flash',
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
