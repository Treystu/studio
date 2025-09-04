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

const SummarizeBatteryHealthInputSchema = z.object({
  batteryId: z.string().describe('The ID of the battery.'),
  soc: z.number().describe('The current State of Charge (SOC) of the battery.'),
  voltage: z.number().describe('The current voltage of the battery.'),
  current: z.number().describe('The current of the battery.'),
  maxCellVoltage: z.number().describe('The maximum cell voltage.'),
  minCellVoltage: z.number().describe('The minimum cell voltage.'),
  averageCellVoltage: z.number().describe('The average cell voltage.'),
  cycleCount: z.number().describe('The number of charge cycles the battery has undergone.'),
});
export type SummarizeBatteryHealthInput = z.infer<typeof SummarizeBatteryHealthInputSchema>;

const SummarizeBatteryHealthOutputSchema = z.object({
  summary: z.string().describe('A summary of the battery health based on the provided data.'),
});
export type SummarizeBatteryHealthOutput = z.infer<typeof SummarizeBatteryHealthOutputSchema>;

export async function summarizeBatteryHealth(input: SummarizeBatteryHealthInput): Promise<SummarizeBatteryHealthOutput> {
  return summarizeBatteryHealthFlow(input);
}

const summarizeBatteryHealthPrompt = ai.definePrompt({
  name: 'summarizeBatteryHealthPrompt',
  input: {schema: SummarizeBatteryHealthInputSchema},
  output: {schema: SummarizeBatteryHealthOutputSchema},
  prompt: `You are an AI assistant specializing in providing summarized overviews of battery health.

  Based on the following battery data, provide a concise summary of the battery's current health status. Include key metrics such as SOC, voltage, and any significant deviations.

  Battery ID: {{{batteryId}}}
  SOC: {{{soc}}}
  Voltage: {{{voltage}}}
  Current: {{{current}}}
  Max Cell Voltage: {{{maxCellVoltage}}}
  Min Cell Voltage: {{{minCellVoltage}}}
  Average Cell Voltage: {{{averageCellVoltage}}}
  Cycle Count: {{{cycleCount}}}

  Provide a summary that is easy to understand for a non-technical user.
  `,
});

const summarizeBatteryHealthFlow = ai.defineFlow(
  {
    name: 'summarizeBatteryHealthFlow',
    inputSchema: SummarizeBatteryHealthInputSchema,
    outputSchema: SummarizeBatteryHealthOutputSchema,
  },
  async input => {
    const {output} = await summarizeBatteryHealthPrompt(input);
    return output!;
  }
);
