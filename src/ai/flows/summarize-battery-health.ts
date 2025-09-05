
'use server';

/**
 * This file defines a Genkit flow to summarize the battery's health based on extracted data.
 * - summarizeBatteryHealth: A function that triggers the health summary generation.
 * - SummarizeBatteryHealthInput: The input type for the summarizeBatteryHealth function.
 * - SummarizeBatteryHealthOutput: The return type for the summarizeBatteryHealth function.
*/

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { logger } from '@/lib/logger';
import { dynamicallyInitializeGoogleAI } from '@/ai/init';

const SummarizeBatteryHealthInputSchema = z.object({
  batteryId: z.string().describe('The ID of the battery.'),
  soc: z.number().describe('The current State of Charge (SOC) of the battery.'),
  voltage: z.number().describe('The current voltage of the battery.'),
  current: z.number().describe('The current of the battery.'),
  maxCellVoltage: z.number().nullable().describe('The maximum cell voltage. Can be null if data is missing.'),
  minCellVoltage: z.number().nullable().describe('The minimum cell voltage. Can be null if data is missing.'),
  averageCellVoltage: z.number().nullable().describe('The average cell voltage. Can be null if data is missing.'),
  cycleCount: z.number().describe('The number of charge cycles.'),
});
export type SummarizeBatteryHealthInput = z.infer<typeof SummarizeBatteryHealthInputSchema>;

const SummarizeBatteryHealthOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the battery\'s health.'),
});
export type SummarizeBatteryHealthOutput = z.infer<typeof SummarizeBatteryHealthOutputSchema>;

const summarizeBatteryHealthPrompt = ai.definePrompt({
    name: 'summarizeBatteryHealthPrompt',
    input: { schema: SummarizeBatteryHealthInputSchema },
    output: { schema: SummarizeBatteryHealthOutputSchema },
    model: 'googleai/gemini-pro',
    prompt: `You are an AI assistant specializing in summarizing battery health.
  
      Based on the provided data, generate a concise summary of the battery's overall health. Focus on translating the metrics into an easy-to-understand assessment for a non-technical user. Mention key indicators like cell balance (from voltage differences) and age (from cycle count).
  
      Here is the battery data:
      {{{jsonStringify this}}}
  
      Return the summary in JSON format.
      `,
});

export async function summarizeBatteryHealth(input: SummarizeBatteryHealthInput): Promise<SummarizeBatteryHealthOutput> {
  return summarizeBatteryHealthFlow(input);
}

const summarizeBatteryHealthFlow = ai.defineFlow(
  {
    name: 'summarizeBatteryHealthFlow',
    inputSchema: SummarizeBatteryHealthInputSchema,
    outputSchema: SummarizeBatteryHealthOutputSchema,
  },
  async input => {
    logger.info('summarizeBatteryHealthFlow invoked for battery:', input.batteryId);
    dynamicallyInitializeGoogleAI();
    
    const { output } = await summarizeBatteryHealthPrompt(input);
    
    if (!output) {
        throw new Error('No output from AI');
    }

    logger.info('summarizeBatteryHealthFlow successful for:', input.batteryId);
    return output;
  }
);
