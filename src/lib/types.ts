import type { extractDataFromBMSImages } from '@/ai/flows/extract-data-from-bms-image';

export type BatteryDataPoint = Awaited<ReturnType<typeof extractDataFromBMSImages>>['results'][0];

export interface RawBatteryDataPoint extends Omit<BatteryDataPoint, 'timestamp'> {
  timestamp: Date;
}

export interface BatteryDataPointWithDate extends Omit<BatteryDataPoint, 'timestamp'> {
  timestamp: Date;
  uploadCount: number;
}

export type BatteryCollection = {
  [batteryId: string]: BatteryDataPointWithDate[];
};

export type RawBatteryCollection = {
  [batteryId: string]: RawBatteryDataPoint[];
};
