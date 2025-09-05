
'use server';

/**
 * @fileOverview Extracts key data points from BMS screenshots using a vision model.
 *
 * - extractDataFromBMSImages - A function that handles the data extraction process for multiple images.
 * - ExtractDataFromBMSImagesInput - The input type for the function.
 * - ExtractDataFromBMSImagesOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { logger } from '@/lib/logger';

const ExtractDataFromBMSImagesInputSchema = z.object({
  photoDataUris: z.array(
    z
    .string()
    .describe(
      "A photo of a BMS screenshot, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ))
});
export type ExtractDataFromBMSImagesInput = z.infer<typeof ExtractDataFromBMSImagesInputSchema>;

const SingleBMSDataSchema = z.object({
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

const ExtractDataFromBMSImagesOutputSchema = z.object({
    results: z.array(SingleBMSDataSchema)
});
export type ExtractDataFromBMSImagesOutput = z.infer<typeof ExtractDataFromBMSImagesOutputSchema>;


const extractDataPrompt = ai.definePrompt({
    name: 'extractDataPrompt',
    input: { schema: ExtractDataFromBMSImagesInputSchema },
    output: { schema: ExtractDataFromBMSImagesOutputSchema },
    model: 'googleai/gemini-1.5-flash-latest',
    prompt: `You are an expert system designed to extract data from multiple Battery Management System (BMS) screenshots.
    
      Analyze all the provided screenshots and extract the key data points from each one. Ensure the extracted values are accurate and properly formatted. If a value is not present in a screenshot, return null for that field.
  
      For each image, extract:
      - Battery ID: The unique identifier of the battery.
      - State of Charge (SOC): (%)
      - Voltage: (V)
      - Current: (A)
      - Remaining Capacity: (Ah)
      - Max, Min, Avg Cell Voltage: (V)
      - Cell Voltage Difference: (V)
      - Cycle Count
      - Power: (kW)
      - MOS Charge & Discharge Status
      - Balance Status
      - Timestamp: (date and time) from the screenshot.
  
      Return all extracted data points in a single JSON object containing a "results" array.
      
      {{#each photoDataUris}}
      {{media url=this}}
      {{/each}}
    `,
});

export async function extractDataFromBMSImages(input: ExtractDataFromBMSImagesInput): Promise<ExtractDataFromBMSImagesOutput> {
  return extractDataFromBMSImagesFlow(input);
}

const extractDataFromBMSImagesFlow = ai.defineFlow(
  {
    name: 'extractDataFromBMSImagesFlow',
    inputSchema: ExtractDataFromBMSImagesInputSchema,
    outputSchema: ExtractDataFromBMSImagesOutputSchema,
  },
  async input => {
    logger.info(`extractDataFromBMSImagesFlow invoked with ${input.photoDataUris.length} images.`);

    const { output } = await extractDataPrompt(input);
    
    if (!output) {
      throw new Error('No output from AI');
    }

    logger.info(`extractDataFromBMSImagesFlow successful. Extracted data for ${output.results.length} images.`);
    return output;
  }
);
