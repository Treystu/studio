
'use server';

/**
 * @fileOverview This file defines a Genkit flow to summarize the battery's health based on extracted data.
 *
 * The flow takes battery data as input and generates a concise summary of the battery's current health status.
 *
 * - summarizeBatteryHealth - A function that triggers the battery health summarization and returns the summary.
 * - SummarizeBatteryHealthInput - The input type for the summarizeBatteryHealth function, including battery data.
 * - SummarizeBatteryHealthOutput - The return type for the summarizeBatteryHealth function, containing the battery health summary.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {logger} from '@/lib/logger';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const SummarizeBatteryHealthInputSchema = z.object({
  batteryId: z.string().describe('The ID of the battery.'),
  soc: z.number().describe('The current State of Charge (SOC) of the battery.'),
  voltage: z.number().describe('The current voltage of the battery.'),
  current: z.number().describe('The current of the battery.'),
  maxCellVoltage: z.number().nullable().describe('The maximum cell voltage. Can be null if data is missing.'),
  minCellVoltage: z.number().nullable().describe('The minimum cell voltage. Can be null if data is missing.'),
  averageCellVoltage: z.number().nullable().describe('The average cell voltage. Can be null if data is missing.'),
  cycleCount: z.number().describe('The number of charge cycles the battery has undergone.'),
  apiKey: z.string().optional().describe('The Google AI API key.'),
});
export type SummarizeBatteryHealthInput = z.infer<typeof SummarizeBatteryHealthInputSchema>;

const SummarizeBatteryHealthOutputSchema = z.object({
  summary: z.string().describe('A summary of the battery health based on the provided data.'),
});
export type SummarizeBatteryHealthOutput = z.infer<typeof SummarizeBatteryHealthOutputSchema>;

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
    const { apiKey, ...promptData } = input;
    if (!apiKey) {
      logger.error('CRITICAL: API key is missing in summarizeBatteryHealthFlow');
      throw new Error('API key is required.');
    }
    
    try {
        const localAi = genkit({
            plugins: [googleAI({ apiKey })],
        });

        const { output } = await localAi.generate({
            model: 'googleai/gemini-pro',
            prompt: `You are an AI assistant specializing in providing summarized overviews of battery health.
          
              Based on the following battery data, provide a concise summary of the battery's current health status. Include key metrics such as SOC, voltage, and any significant deviations.
              
              If maxCellVoltage, minCellVoltage or averageCellVoltage are null, do not mention them in the summary or consider them as 0. Acknowledge that this data might be missing.
          
              Battery ID: ${promptData.batteryId}
              SOC: ${promptData.soc}
              Voltage: ${promptData.voltage}
              Current: ${promptData.current}
              Max Cell Voltage: ${promptData.maxCellVoltage}
              Min Cell Voltage: ${promptData.minCellVoltage}
              Average Cell Voltage: ${promptData.averageCellVoltage}
              Cycle Count: ${promptData.cycleCount}
          
              Provide a summary that is easy to understand for a non-technical user.
              `,
            output: {
                schema: SummarizeBatteryHealthOutputSchema
            }
        });

        if (!output) {
            throw new Error('No output from AI');
        }

        logger.info('summarizeBatteryHealthFlow successful for:', input.batteryId);
        return output;
    } catch (e: any) {
        logger.error('FATAL: Error in summarizeBatteryHealthFlow generate call:', e);
        throw e;
    }
  }
);
