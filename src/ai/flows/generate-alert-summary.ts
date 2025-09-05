
'use server';

/**
 * @fileOverview This file defines a Genkit flow to generate a summary of active alerts for battery data.
 *
 * The flow takes a list of alerts and generates a concise summary, highlighting the most critical issues.
 *
 * - generateAlertSummary - A function that triggers the alert summary generation.
 * - GenerateAlertSummaryInput - The input type for the generateAlertSummary function, including a list of alerts.
 * - GenerateAlertSummaryOutput - The return type for the generateAlertsummary function, providing the summary.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { logger } from '@/lib/logger';
import { dynamicallyInitializeGoogleAI } from '@/ai/init';

const GenerateAlertSummaryInputSchema = z.object({
  alerts: z.array(
    z.string().describe('A list of active alerts for the battery.')
  ).describe('The alerts to be summarized.'),
});
export type GenerateAlertSummaryInput = z.infer<typeof GenerateAlertSummaryInputSchema>;

const GenerateAlertSummaryOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the active alerts.'),
});
export type GenerateAlertSummaryOutput = z.infer<typeof GenerateAlertSummaryOutputSchema>;

const generateAlertSummaryPrompt = ai.definePrompt({
    name: 'generateAlertSummaryPrompt',
    input: { schema: GenerateAlertSummaryInputSchema },
    output: { schema: GenerateAlertSummaryOutputSchema },
    model: 'googleai/gemini-pro',
    prompt: `You are an AI assistant specializing in summarizing battery alerts.
  
      Given the following list of alerts, generate a concise summary highlighting the most critical issues affecting the battery. Focus on providing actionable insights that allow users to quickly understand and respond to the problems.
  
      Alerts:
      {{#each alerts}}
      - {{{this}}}
      {{/each}}
  
      Summary:`,
});

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
    dynamicallyInitializeGoogleAI();
    
    const { output } = await generateAlertSummaryPrompt(input);
    
    if (!output) {
      throw new Error('No output from AI');
    }

    logger.info('generateAlertSummaryFlow successful.');
    return output;
  }
);
