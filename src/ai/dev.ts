import { config } from 'dotenv';
config();

import '@/ai/flows/display-alerts-for-data-deviations.ts';
import '@/ai/flows/extract-data-from-bms-image.ts';
import '@/ai/flows/summarize-battery-health.ts';
import '@/ai/flows/generate-alert-summary.ts';