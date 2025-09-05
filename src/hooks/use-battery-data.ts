"use client";

import { useReducer, useCallback, useEffect, useMemo, useRef } from 'react';
import type { BatteryCollection, BatteryDataPoint, BatteryDataPointWithDate, RawBatteryCollection, RawBatteryDataPoint } from '@/lib/types';
import { extractDataFromBMSImage } from '@/ai/flows/extract-data-from-bms-image';
import { displayAlertsForDataDeviations } from '@/ai/flows/display-alerts-for-data-deviations';
import { useToast } from './use-toast';

// == STATE & REDUCER == //
type State = {
  batteries: BatteryCollection;
  rawBatteries: RawBatteryCollection;
  currentBatteryId: string | null;
  isLoading: boolean;
  alerts: string[];
  uploadProgress: number | null;
  processedFileCount: number;
  totalFileCount: number;
};

type Action =
  | { type: 'START_LOADING'; payload: { totalFiles: number } }
  | { type: 'STOP_LOADING' }
  | { type: 'RESET_UPLOAD_STATE' }
  | { type: 'SET_BATTERIES'; payload: { batteries: BatteryCollection, rawBatteries: RawBatteryCollection } }
  | { type: 'SET_CURRENT_BATTERY'; payload: string }
  | { type: 'ADD_DATA'; payload: { data: BatteryDataPoint; dateContext: Date, isFirstUpload: boolean } }
  | { type: 'SET_ALERTS'; payload: string[] }
  | { type: 'CLEAR_BATTERY_DATA'; payload: string }
  | { type: 'SET_UPLOAD_PROGRESS'; payload: { progress: number | null, processed: number } };

const initialState: State = {
  batteries: {},
  rawBatteries: {},
  currentBatteryId: null,
  isLoading: false,
  alerts: [],
  uploadProgress: null,
  processedFileCount: 0,
  totalFileCount: 0,
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, isLoading: true, totalFileCount: action.payload.totalFiles, processedFileCount: 0, uploadProgress: 0 };
    case 'STOP_LOADING':
      return { ...state, isLoading: false };
    case 'RESET_UPLOAD_STATE':
        return { ...state, isLoading: false, totalFileCount: 0, processedFileCount: 0, uploadProgress: null };
    case 'SET_BATTERIES':
      return { ...state, batteries: action.payload.batteries, rawBatteries: action.payload.rawBatteries };
    case 'SET_CURRENT_BATTERY':
      return { ...state, currentBatteryId: action.payload, alerts: [] };
    case 'ADD_DATA': {
      const { data, dateContext, isFirstUpload } = action.payload;
      const { batteryId } = data;
      const timeParts = data.timestamp.split(':').map(Number);

      const newTimestamp = new Date(dateContext);
      // If dateContext has a time component from filename, it will be used. Otherwise, use time from screenshot.
      if (newTimestamp.getHours() === 0 && newTimestamp.getMinutes() === 0 && newTimestamp.getSeconds() === 0) {
        newTimestamp.setHours(timeParts[0] || 0, timeParts[1] || 0, timeParts[2] || 0, 0);
      }

      const newRawDataPoint: RawBatteryDataPoint = { ...data, timestamp: newTimestamp };
      const newAveragedDataPoint: BatteryDataPointWithDate = { ...data, timestamp: newTimestamp, uploadCount: 1 };

      const updatedRawBatteries = { ...state.rawBatteries };
      const existingRawData = updatedRawBatteries[batteryId] || [];
      updatedRawBatteries[batteryId] = [...existingRawData, newRawDataPoint].sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime());

      const updatedAveragedBatteries = { ...state.batteries };
      const existingAveragedData = updatedAveragedBatteries[batteryId] || [];
      
      const hourKey = new Date(newTimestamp.getFullYear(), newTimestamp.getMonth(), newTimestamp.getDate(), newTimestamp.getHours()).getTime();
      
      const existingIndex = existingAveragedData.findIndex(p => {
        const pDate = p.timestamp;
        return new Date(pDate.getFullYear(), pDate.getMonth(), pDate.getDate(), pDate.getHours()).getTime() === hourKey;
      });

      if (existingIndex !== -1) {
        const existingPoint = existingAveragedData[existingIndex];
        const averagedPoint = { ...existingPoint };

        const existingCount = existingPoint.uploadCount || 1;
        const newTotalCount = existingCount + 1;

        (Object.keys(newAveragedDataPoint) as Array<keyof BatteryDataPointWithDate>).forEach(key => {
          if (typeof existingPoint[key] === 'number' && typeof newAveragedDataPoint[key] === 'number' && key !== 'uploadCount') {
            const existingValue = existingPoint[key] as number;
            const newValue = newAveragedDataPoint[key] as number;
            (averagedPoint[key] as number) = (existingValue * existingCount + newValue) / newTotalCount;
          } else if (newAveragedDataPoint[key] !== null && newAveragedDataPoint[key] !== undefined) {
             // For non-numeric or new nullable fields, prefer the new data if it's not null.
             // @ts-ignore
            averagedPoint[key] = newAveragedDataPoint[key];
          }
        });
        
        averagedPoint.uploadCount = newTotalCount;
        existingAveragedData[existingIndex] = { ...averagedPoint, timestamp: existingPoint.timestamp }; 
        updatedAveragedBatteries[batteryId] = [...existingAveragedData];
      } else {
        updatedAveragedBatteries[batteryId] = [...existingAveragedData, newAveragedDataPoint].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      }
      
      const newState = { ...state, batteries: updatedAveragedBatteries, rawBatteries: updatedRawBatteries };
      if (isFirstUpload && !state.currentBatteryId) {
        newState.currentBatteryId = batteryId;
      }
      return newState;
    }
    case 'SET_ALERTS':
      return { ...state, alerts: action.payload };
    case 'CLEAR_BATTERY_DATA': {
      if (!action.payload) return state;
      const newBatteries = { ...state.batteries };
      delete newBatteries[action.payload];
      const newRawBatteries = { ...state.rawBatteries };
      delete newRawBatteries[action.payload];
      const newCurrentBatteryId = Object.keys(newBatteries)[0] || null;
      return { ...state, batteries: newBatteries, rawBatteries: newRawBatteries, currentBatteryId: newCurrentBatteryId, alerts: [] };
    }
    case 'SET_UPLOAD_PROGRESS':
      return { ...state, uploadProgress: action.payload.progress, processedFileCount: action.payload.processed };
    default:
      return state;
  }
};

// Function to parse date from filename
// Supports formats like "Screenshot_YYYYMMDD-HHMMSS.png" or "IMG_YYYY-MM-DD_HH-MM-SS.jpg"
const parseDateFromFilename = (filename: string): Date | null => {
    // Regex for YYYYMMDD-HHMMSS or YYYYMMDD_HHMMSS
    const regex1 = /(\d{4})(\d{2})(\d{2})[-_]?(\d{2})(\d{2})(\d{2})/;
    const match1 = filename.match(regex1);
    if (match1) {
        const [, year, month, day, hour, minute, second] = match1.map(Number);
        return new Date(year, month - 1, day, hour, minute, second);
    }
    
    // Regex for YYYY-MM-DD_HH-MM-SS
    const regex2 = /(\d{4})-(\d{2})-(\d{2})[-_]?(\d{2})-(\d{2})-(\d{2})/;
    const match2 = filename.match(regex2);
    if (match2) {
        const [, year, month, day, hour, minute, second] = match2.map(Number);
        return new Date(year, month - 1, day, hour, minute, second);
    }

    return null;
}

// == HOOK == //
export const useBatteryData = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { toast } = useToast();
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processUploadedFiles = useCallback(async (files: File[], dateContext: Date) => {
    const totalFiles = files.length;
    dispatch({ type: 'START_LOADING', payload: { totalFiles } });
    let successfulUploads = 0;

    for (const [index, file] of files.entries()) {
      const baseProgress = (index / totalFiles) * 100;
      let fileDateContext = dateContext;

      const dateFromFilename = parseDateFromFilename(file.name);
      if (dateFromFilename) {
          fileDateContext = dateFromFilename;
      }
      
      try {
        const reader = new FileReader();
        const dataUri = await new Promise<string>((resolve, reject) => {
          reader.onload = e => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        const progressAfterRead = baseProgress + (1 / totalFiles) * 100 * 0.3; // 30% of file progress
        dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: { progress: progressAfterRead, processed: index } });

        const extractedData = await extractDataFromBMSImage({ photoDataUri: dataUri });
        
        const progressAfterExtract = baseProgress + (1 / totalFiles) * 100 * 0.9; // 90% of file progress
        dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: { progress: progressAfterExtract, processed: index } });
        
        const isFirstUpload = state.currentBatteryId === null && index === 0;
        dispatch({ type: 'ADD_DATA', payload: { data: extractedData, dateContext: fileDateContext, isFirstUpload } });
        successfulUploads++;

      } catch (error) {
        console.error('Error processing file:', file.name, error);
        toast({
          variant: 'destructive',
          title: `Error processing ${file.name}`,
          description: 'Could not extract data from the image.',
        });
      } finally {
          const finalProgress = ((index + 1) / totalFiles) * 100;
          dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: { progress: finalProgress, processed: index + 1 } });
      }
    }

    // Use a timeout to allow the progress bar to reach 100% and be visible.
    setTimeout(() => {
      dispatch({ type: 'RESET_UPLOAD_STATE' });
      
      if (successfulUploads > 0) {
          toast({
              title: 'Upload Complete',
              description: `${successfulUploads}/${totalFiles} file(s) processed successfully.`,
            });
      }
    }, 1000);

  }, [toast, state.currentBatteryId]);

  const setCurrentBatteryId = useCallback((batteryId: string) => {
    dispatch({ type: 'SET_CURRENT_BATTERY', payload: batteryId });
  }, []);

  const clearCurrentBatteryData = useCallback((backup: boolean) => {
    if (!state.currentBatteryId) return;
    if (backup) {
      // In a real app, you'd send this to a server or download it.
      // For this example, we'll just log it to the console.
      const dataToBackup = {
          averagedData: state.batteries[state.currentBatteryId],
          rawData: state.rawBatteries[state.currentBatteryId],
      }
      console.log('Backing up data for', state.currentBatteryId, dataToBackup);
      const dataBlob = new Blob([JSON.stringify(dataToBackup, null, 2)], {type : 'application/json'});
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${state.currentBatteryId}_backup_${new Date().toISOString()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: 'Data Backup', description: `Data for ${state.currentBatteryId} has been downloaded.` });
    }
    dispatch({ type: 'CLEAR_BATTERY_DATA', payload: state.currentBatteryId });
    toast({ title: 'Data Cleared', description: `All data for ${state.currentBatteryId} has been removed.` });
  }, [state.currentBatteryId, state.batteries, state.rawBatteries, toast]);
  
  const currentBatteryData = useMemo(() => state.currentBatteryId ? state.batteries[state.currentBatteryId] || [] : [], [state.currentBatteryId, state.batteries]);
  const currentBatteryRawData = useMemo(() => state.currentBatteryId ? state.rawBatteries[state.currentBatteryId] || [] : [], [state.currentBatteryId, state.rawBatteries]);
  const latestDataPoint = useMemo(() => currentBatteryData.length > 0 ? currentBatteryData[currentBatteryData.length - 1] : null, [currentBatteryData]);

  useEffect(() => {
    if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
    }

    if (!latestDataPoint) {
      if(state.alerts.length > 0) {
        dispatch({ type: 'SET_ALERTS', payload: [] });
      }
      return;
    }

    const checkForAlerts = async () => {
      try {
        const { alerts } = await displayAlertsForDataDeviations({
          batteryId: latestDataPoint.batteryId,
          soc: latestDataPoint.soc,
          voltage: latestDataPoint.voltage,
          current: latestDataPoint.current,
          maxCellVoltage: latestDataPoint.maxCellVoltage ?? null,
          minCellVoltage: latestDataPoint.minCellVoltage ?? null,
          averageCellVoltage: latestDataPoint.avgCellVoltage ?? null,
        });
        if (JSON.stringify(alerts) !== JSON.stringify(state.alerts)) {
            dispatch({ type: 'SET_ALERTS', payload: alerts });
        }
      } catch (error) {
        console.error("Error checking for alerts:", error);
        // Avoid showing toast for rate limit errors which are expected
        if (error instanceof Error && !error.message.includes('429')) {
            toast({
                variant: "destructive",
                title: "Could not check for alerts",
                description: "There was an issue with the AI service.",
            });
        }
      }
    };
    
    // Debounce the call to prevent rate limiting issues during rapid uploads
    alertTimeoutRef.current = setTimeout(checkForAlerts, 1500);

    return () => {
        if(alertTimeoutRef.current) {
            clearTimeout(alertTimeoutRef.current);
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestDataPoint, toast]);


  return {
    ...state,
    currentBatteryData,
    currentBatteryRawData,
    latestDataPoint,
    processUploadedFiles,
    setCurrentBatteryId,
    clearCurrentBatteryData,
  };
};

    