
'use server';

/**
 * @fileOverview Extracts key data points from a BMS screenshot using a vision model.
 *
 * - extractDataFromBMSImage - A function that handles the data extraction process.
 * - ExtractDataFromBMSImageInput - The input type for the extractDataFromBMSImage function.
 * - ExtractDataFromBMSImageOutput - The return type for the extractDataFromBMSImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { logger } from '@/lib/logger';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const ExtractDataFromBMSImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a BMS screenshot, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  apiKey: z.string().optional().describe('The Google AI API key.'),
});
export type ExtractDataFromBMSImageInput = z.infer<typeof ExtractDataFromBMSImageInputSchema>;

const ExtractDataFromBMSImageOutputSchema = z.object({
  batteryId: z.string().describe('The unique identifier of the battery.'),
  soc: z.number().describe('The State of Charge of the battery (%).'),
  voltage: z.number().describe('The voltage of the battery (V).'),
  current: z.number().describe('The current of the battery (A).'),
  remainingCapacity: z.number().describe('The remaining capacity of the battery (Ah).'),
  maxCellVoltage: z.number().nullable().optional().describe('The maximum cell voltage (V).'),
  minCellVoltage: z.number().nullable().optional().describe('The minimum cell voltage (V).'),
  avgCellVoltage: z.number().nullable().optional().describe('The average cell voltage (V).'),
  cellVoltageDifference: z.number().nullable().optional().describe('The difference between the maximum and minimum cell voltages (V).'),
  cycleCount: z.number().describe('The number of charge cycles the battery has undergone.'),
  power: z.number().describe('The power of the battery (kW).'),
  mosChargeStatus: z.string().describe('The status of the MOS (Metal-Oxide-Semiconductor) during charging (Charge/Discharge).'),
  mosDischargeStatus: z.string().describe('The status of the MOS (Metal-Oxide-Semiconductor) during discharging (Charge/Discharge).'),
  balanceStatus: z.string().describe('The balance status of the battery.'),
  timestamp: z.string().describe('The timestamp (date and time) from the screenshot.'),
});
export type ExtractDataFromBMSImageOutput = z.infer<typeof ExtractDataFromBMSImageOutputSchema>;

export async function extractDataFromBMSImage(input: ExtractDataFromBMSImageInput): Promise<ExtractDataFromBMSImageOutput> {
  return extractDataFromBMSImageFlow(input);
}

const extractDataFromBMSImageFlow = ai.defineFlow(
  {
    name: 'extractDataFromBMSImageFlow',
    inputSchema: ExtractDataFromBMSImageInputSchema,
    outputSchema: ExtractDataFromBMSImageOutputSchema,
  },
  async input => {
    logger.info('extractDataFromBMSImageFlow invoked.');
    const { apiKey, ...promptData } = input;
    if (!apiKey) {
      logger.error('CRITICAL: API key is missing in extractDataFromBMSImageFlow');
      throw new Error('API key is required.');
    }
    
    try {
        const localAi = genkit({
            plugins: [googleAI({ apiKey })],
        });
        
        const { output } = await localAi.generate({
            model: 'gemini-pro-vision',
            prompt: [
              { text: `You are an expert system designed to extract data from Battery Management System (BMS) screenshots.
        
                Analyze the provided screenshot and extract the following key data points. Ensure the extracted values are accurate and properly formatted. If a value is not present in the screenshot, return null for that field.
            
                - Battery ID: Extract the unique identifier of the battery.
                - State of Charge (SOC): Extract the State of Charge of the battery (%).
                - Voltage: Extract the voltage of the battery (V).
                - Current: Extract the current of the battery (A).
                - Remaining Capacity: Extract the remaining capacity of the battery (Ah).
                - Max Cell Voltage: Extract the maximum cell voltage (V).
                - Min Cell Voltage: Extract the minimum cell voltage (V).
                - Avg Cell Voltage: Extract the average cell voltage (V).
                - Cell Voltage Difference: Extract the difference between the maximum and minimum cell voltages (V).
                - Cycle Count: Extract the number of charge cycles the battery has undergone.
                - Power: Extract the power of the battery (kW).
                - MOS Charge Status: Extract the status of the MOS (Metal-Oxide-Semiconductor) during charging (Charge/Discharge).
                - MOS Discharge Status: Extract the status of the MOS (Metal-Oxide-Semiconductor) during discharging (Charge/Discharge).
                - Balance Status: Extract the balance status of the battery.
                - Timestamp: Extract the timestamp (date and time) from the screenshot.
            
                Return the extracted data in JSON format.` },
              { media: { url: promptData.photoDataUri } }
            ],
            output: {
                schema: ExtractDataFromBMSImageOutputSchema
            }
        });
        
        if (!output) {
          logger.error('No output from AI');
          throw new Error('No output from AI');
        }

        logger.info('extractDataFromBMSImageFlow successful.');
        return output;
    } catch (e: any) {
        logger.error('FATAL: Error in extractDataFromBMSImageFlow generate call:', e);
        throw e;
    }
  }
);
