'use server';
/**
 * @fileOverview This file defines a Genkit flow to display alerts for major data deviations in battery data.
 *
 * The flow analyzes battery data and determines if any critical deviations have occurred,
 * such as a rapid drop in State of Charge (SOC) or a high voltage difference between cells.
 *
 * - displayAlertsForDataDeviations - A function that triggers the data deviation analysis and returns any alerts.
 * - DisplayAlertsInput - The input type for the displayAlertsForDataDeviations function, including battery data.
 * - DisplayAlertsOutput - The return type for the displayAlertsForDataDeviations function, listing any alerts.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {logger} from '@/lib/logger';
import {genkit} from 'genkit';

const DisplayAlertsInputSchema = z.object({
  batteryId: z.string().describe('The ID of the battery.'),
  soc: z.number().describe('The current State of Charge (SOC) of the battery.'),
  voltage: z.number().describe('The current voltage of the battery.'),
  current: z.number().describe('The current of the battery.'),
  maxCellVoltage: z.number().nullable().describe('The maximum cell voltage. Can be null if data is missing.'),
  minCellVoltage: z.number().nullable().describe('The minimum cell voltage. Can be null if data is missing.'),
  averageCellVoltage: z.number().nullable().describe('The average cell voltage. Can be null if data is missing.'),
  apiKey: z.string().optional().describe('The Google AI API key.'),
});
export type DisplayAlertsInput = z.infer<typeof DisplayAlertsInputSchema>;

const DisplayAlertsOutputSchema = z.object({
  alerts: z.array(
    z.string().describe('A list of alerts based on data deviations.')
  ),
});
export type DisplayAlertsOutput = z.infer<typeof DisplayAlertsOutputSchema>;

export async function displayAlertsForDataDeviations(
  input: DisplayAlertsInput
): Promise<DisplayAlertsOutput> {
  return displayAlertsFlow(input);
}

const displayAlertsPrompt = ai.definePrompt({
  name: 'displayAlertsPrompt',
  input: {schema: DisplayAlertsInputSchema},
  output: {schema: DisplayAlertsOutputSchema},
  prompt: `You are an AI assistant specializing in identifying critical data deviations in battery data and generating alerts.

  Analyze the following battery data and determine if any major deviations have occurred.  Specifically, look for:
  1. A rapid drop in SOC (State of Charge).
  2. A high voltage difference between cells (maxCellVoltage - minCellVoltage).

  If maxCellVoltage or minCellVoltage are null or 0, do not generate an alert for cell voltage inconsistency. Only generate alerts for valid, non-zero voltage readings that indicate a problem.

  Based on your analysis, generate a list of alerts describing the issues. If no significant deviations are detected, return an empty list.

  Here is the a battery data:
  Battery ID: {{{batteryId}}}
  SOC: {{{soc}}}
  Voltage: {{{voltage}}}
  Current: {{{current}}}
  Max Cell Voltage: {{{maxCellVoltage}}}
  Min Cell Voltage: {{{minCellVoltage}}}
  Average Cell Voltage: {{{averageCellVoltage}}}

  Return the alerts in a JSON format.
  `,
});

const displayAlertsFlow = ai.defineFlow(
  {
    name: 'displayAlertsFlow',
    inputSchema: DisplayAlertsInputSchema,
    outputSchema: DisplayAlertsOutputSchema,
  },
  async input => {
    logger.info('displayAlertsFlow invoked with input for battery:', input.batteryId);
    const {apiKey, ...promptData} = input;
    if (!apiKey) {
      logger.error('CRITICAL: API key is missing in displayAlertsFlow');
      throw new Error('API key is required.');
    }
    
    const configuredAi = genkit({
        plugins: [googleAI({apiKey})],
    });

    try {
        const {output} = await configuredAi.generate({
            model: 'googleai/gemini-1.5-flash',
            prompt: displayAlertsPrompt.prompt,
            input: promptData,
            output: {
              schema: DisplayAlertsOutputSchema,
            },
        });
        logger.info('displayAlertsFlow successful for:', input.batteryId);
        return output;
    } catch (e: any) {
        logger.error('FATAL: Error in displayAlertsFlow generate call:', e.message, e.stack);
        throw e;
    }
  }
);
