"use client";

import { useReducer, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BatteryCollection, BatteryDataPoint, BatteryDataPointWithDate, RawBatteryCollection, RawBatteryDataPoint } from '@/lib/types';
import { extractDataFromBMSImage } from '@/ai/flows/extract-data-from-bms-image';
import { displayAlertsForDataDeviations } from '@/ai/flows/display-alerts-for-data-deviations';
import { summarizeBatteryHealth } from '@/ai/flows/summarize-battery-health';
import { useToast } from './use-toast';

// == STATE & REDUCER == //
type State = {
  batteries: BatteryCollection;
  rawBatteries: RawBatteryCollection;
  currentBatteryId: string | null;
  isLoading: boolean;
  alerts: string[];
  healthSummary: string;
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
  | { type: 'SET_HEALTH_SUMMARY'; payload: string }
  | { type: 'CLEAR_BATTERY_DATA'; payload: string }
  | { type: 'SET_UPLOAD_PROGRESS'; payload: { progress: number | null, processed: number } };

const initialState: State = {
  batteries: {},
  rawBatteries: {},
  currentBatteryId: null,
  isLoading: false,
  alerts: [],
  healthSummary: '',
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
      return { ...state, currentBatteryId: action.payload, alerts: [], healthSummary: '' };
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
    case 'SET_HEALTH_SUMMARY':
        return { ...state, healthSummary: action.payload };
    case 'CLEAR_BATTERY_DATA': {
      if (!action.payload) return state;
      const newBatteries = { ...state.batteries };
      delete newBatteries[action.payload];
      const newRawBatteries = { ...state.rawBatteries };
      delete newRawBatteries[action.payload];
      const newCurrentBatteryId = Object.keys(newBatteries)[0] || null;
      return { ...state, batteries: newBatteries, rawBatteries: newRawBatteries, currentBatteryId: newCurrentBatteryId, alerts: [], healthSummary: '' };
    }
    case 'SET_UPLOAD_PROGRESS':
      return { ...state, uploadProgress: action.payload.progress, processedFileCount: action.payload.processed };
    default:
      return state;
  }
};

const parseDateFromFilename = (filename: string): Date | null => {
    const regex1 = /(\d{4})(\d{2})(\d{2})[-_]?(\d{2})(\d{2})(\d{2})/;
    const match1 = filename.match(regex1);
    if (match1) {
        const [, year, month, day, hour, minute, second] = match1.map(Number);
        return new Date(year, month - 1, day, hour, minute, second);
    }
    
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
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAiRunning = useRef(false);
  const [previousDataPoint, setPreviousDataPoint] = useState<BatteryDataPointWithDate | null>(null);
  const uploadQueue = useRef<{ file: File; dateContext: Date }[]>([]);
  const isProcessingQueue = useRef(false);


  const processFile = async (file: File, dateContext: Date, isFirstUpload: boolean): Promise<boolean> => {
    try {
        let fileDateContext = dateContext;
        const dateFromFilename = parseDateFromFilename(file.name);
        if (dateFromFilename) {
            fileDateContext = dateFromFilename;
        }

        const reader = new FileReader();
        const dataUri = await new Promise<string>((resolve, reject) => {
            reader.onload = e => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: { progress: (state.processedFileCount / state.totalFileCount) * 100 + (1 / state.totalFileCount) * 30, processed: state.processedFileCount } });

        const extractedData = await extractDataFromBMSImage({ photoDataUri: dataUri });

        dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: { progress: (state.processedFileCount / state.totalFileCount) * 100 + (1 / state.totalFileCount) * 90, processed: state.processedFileCount } });

        dispatch({ type: 'ADD_DATA', payload: { data: extractedData, dateContext: fileDateContext, isFirstUpload } });
        return true;
    } catch (error) {
        console.error('Error processing file:', file.name, error);

        if (error instanceof Error && /429|quota/.test(error.message)) {
            toast({
                variant: 'destructive',
                title: 'Rate limit reached',
                description: `Pausing uploads. Will retry in 1 minute.`,
            });
            return false;
        }

        toast({
            variant: 'destructive',
            title: `Error processing ${file.name}`,
            description: 'Could not extract data from the image.',
        });
        // In case of non-rate-limiting error, we still count it as "processed" to not get stuck.
        dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: { progress: ((state.processedFileCount + 1) / state.totalFileCount) * 100, processed: state.processedFileCount + 1 } });
        return true; // Return true to move to the next file
    }
  }

  const processQueue = useCallback(async () => {
    if (isProcessingQueue.current || uploadQueue.current.length === 0) {
      isProcessingQueue.current = false;
      return;
    }

    isProcessingQueue.current = true;
    const { file, dateContext } = uploadQueue.current[0];
    const isFirstUpload = state.currentBatteryId === null && state.processedFileCount === 0;

    const success = await processFile(file, dateContext, isFirstUpload);

    if (success) {
      dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: { progress: ((state.processedFileCount + 1) / state.totalFileCount) * 100, processed: state.processedFileCount + 1 } });
      uploadQueue.current.shift();
      if (uploadQueue.current.length > 0) {
        // Continue processing immediately
        processQueue();
      } else {
        // Queue is empty, finish up
        setTimeout(() => {
            dispatch({ type: 'RESET_UPLOAD_STATE' });
            toast({ title: 'Upload Complete', description: `${state.totalFileCount} file(s) processed.` });
        }, 1000);
        isProcessingQueue.current = false;
      }
    } else {
      // It was a rate limit error, wait and retry
      isProcessingQueue.current = false;
      setTimeout(processQueue, 60000); // Wait for 1 minute
    }
  }, [state.currentBatteryId, state.processedFileCount, state.totalFileCount, toast]);

  const processUploadedFiles = useCallback((files: File[], dateContext: Date) => {
    dispatch({ type: 'START_LOADING', payload: { totalFiles: files.length } });
    uploadQueue.current = files.map(file => ({ file, dateContext }));
    
    if (!isProcessingQueue.current) {
        processQueue();
    }
  }, [processQueue]);


  const setCurrentBatteryId = useCallback((batteryId: string) => {
    dispatch({ type: 'SET_CURRENT_BATTERY', payload: batteryId });
    setPreviousDataPoint(null);
  }, []);

  const clearCurrentBatteryData = useCallback((backup: boolean) => {
    if (!state.currentBatteryId) return;
    if (backup) {
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
    if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
    }

    if (!latestDataPoint || isAiRunning.current) {
      return;
    }
    
    const runAiTasks = async () => {
      isAiRunning.current = true;
      try {
        const healthSummaryPromise = summarizeBatteryHealth({
          batteryId: latestDataPoint.batteryId,
          soc: latestDataPoint.soc,
          voltage: latestDataPoint.voltage,
          current: latestDataPoint.current,
          maxCellVoltage: latestDataPoint.maxCellVoltage ?? null,
          minCellVoltage: latestDataPoint.minCellVoltage ?? null,
          averageCellVoltage: latestDataPoint.avgCellVoltage ?? null,
          cycleCount: latestDataPoint.cycleCount,
        });

        let alertsPromise: Promise<{ alerts: string[] }> | null = null;
        const socChanged = previousDataPoint ? Math.abs(latestDataPoint.soc - previousDataPoint.soc) > 2 : true;
        const cellDiffChanged = previousDataPoint ? Math.abs((latestDataPoint.cellVoltageDifference ?? 0) - (previousDataPoint.cellVoltageDifference ?? 0)) > 0.005 : true;

        if (socChanged || cellDiffChanged) {
          alertsPromise = displayAlertsForDataDeviations({
            batteryId: latestDataPoint.batteryId,
            soc: latestDataPoint.soc,
            voltage: latestDataPoint.voltage,
            current: latestDataPoint.current,
            maxCellVoltage: latestDataPoint.maxCellVoltage ?? null,
            minCellVoltage: latestDataPoint.minCellVoltage ?? null,
            averageCellVoltage: latestDataPoint.avgCellVoltage ?? null,
          });
        }
        
        const [healthResult, alertsResult] = await Promise.all([healthSummaryPromise, alertsPromise]);

        if (healthResult?.summary && healthResult.summary !== state.healthSummary) {
          dispatch({ type: 'SET_HEALTH_SUMMARY', payload: healthResult.summary });
        }
        if (alertsResult?.alerts && JSON.stringify(alertsResult.alerts) !== JSON.stringify(state.alerts)) {
          dispatch({ type: 'SET_ALERTS', payload: alertsResult.alerts });
        }
        setPreviousDataPoint(latestDataPoint);
        
      } catch (error) {
        console.error("Error running AI tasks:", error);
        if (error instanceof Error && !/429|503/.test(error.message)) {
            toast({
                variant: "destructive",
                title: "Could not fetch AI insights",
                description: "There was an issue with the AI service. Retrying shortly.",
            });
        }
      } finally {
        isAiRunning.current = false;
      }
    };
    
    aiTimeoutRef.current = setTimeout(runAiTasks, 2000);

    return () => {
        if(aiTimeoutRef.current) {
            clearTimeout(aiTimeoutRef.current);
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestDataPoint]);


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
