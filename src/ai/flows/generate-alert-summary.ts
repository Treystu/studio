
'use server';

/**
 * @fileOverview This file defines a Genkit flow to generate a summary of active alerts for battery data.
 *
 * The flow takes a list of alerts and generates a concise summary, highlighting the most critical issues.
 *
 * - generateAlertSummary - A function that triggers the alert summary generation.
 * - GenerateAlertSummaryInput - The input type for the generateAlertSummary function, including a list of alerts.
 * - GenerateAlertSummaryOutput - The return type for the generateAlertSummary function, providing the summary.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { logger } from '@/lib/logger';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const GenerateAlertSummaryInputSchema = z.object({
  alerts: z.array(
    z.string().describe('A list of active alerts for the battery.')
  ).describe('The alerts to be summarized.'),
  apiKey: z.string().optional().describe('The Google AI API key.'),
});
export type GenerateAlertSummaryInput = z.infer<typeof GenerateAlertSummaryInputSchema>;

const GenerateAlertSummaryOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the active alerts.'),
});
export type GenerateAlertSummaryOutput = z.infer<typeof GenerateAlertSummaryOutputSchema>;

export async function generateAlertSummary(input: GenerateAlertSummaryInput): Promise<GenerateAlertSummaryOutput> {
  return generateAlertSummaryFlow(input);
}

const generateAlertSummaryFlow = ai.defineFlow(
  {
    name: 'generateAlertSummaryFlow',
    inputSchema: GenerateAlertSummaryInputSchema,
    outputSchema: GenerateAlertSummaryOutputSchema,
  },
  async input => {
    logger.info('generateAlertSummaryFlow invoked.');
    const { apiKey, ...promptData } = input;
    if (!apiKey) {
      logger.error('CRITICAL: API key is missing in generateAlertSummaryFlow');
      throw new Error('API key is required.');
    }
    
    try {
        const localAi = genkit({
            plugins: [googleAI({ apiKey })],
        });

        const { output } = await localAi.generate({
            model: 'gemini-pro',
            prompt: `You are an AI assistant specializing in summarizing battery alerts.
          
              Given the following list of alerts, generate a concise summary highlighting the most critical issues affecting the battery. Focus on providing actionable insights that allow users to quickly understand and respond to the problems.
          
              Alerts:
              ${promptData.alerts.map(a => `- ${a}`).join('\n')}
          
              Summary:`,
            output: {
                schema: GenerateAlertSummaryOutputSchema
            },
            config: {
              safetySettings: [
                {
                  category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                  threshold: 'BLOCK_ONLY_HIGH',
                },
              ],
            },
        });
        
        if (!output) {
          throw new Error('No output from AI');
        }

        logger.info('generateAlertSummaryFlow successful.');
        return output;
    } catch (e: any) {
        logger.error('FATAL: Error in generateAlertSummaryFlow generate call:', e);
        throw e;
    }
  }
);
