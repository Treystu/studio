
"use client";

import { useReducer, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BatteryCollection, BatteryDataPoint, BatteryDataPointWithDate, RawBatteryCollection, RawBatteryDataPoint } from '@/lib/types';
import { extractDataFromBMSImage } from '@/ai/flows/extract-data-from-bms-image';
import { displayAlertsForDataDeviations } from '@/ai/flows/display-alerts-for-data-deviations';
import { summarizeBatteryHealth } from '@/ai/flows/summarize-battery-health';
import { generateAlertSummary } from '@/ai/flows/generate-alert-summary';
import { useToast } from './use-toast';
import { logger } from '@/lib/logger';

const API_KEY_STORAGE_KEY = "gemini_api_key";

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
  | { type: 'INCREMENT_PROCESSED_COUNT' }
  | { type: 'SET_UPLOAD_PROGRESS'; payload: { progress: number, processed: number } };

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
      logger.info(`START_LOADING: ${action.payload.totalFiles} files`);
      return { ...state, isLoading: true, totalFileCount: action.payload.totalFiles, processedFileCount: 0, uploadProgress: 0 };
    case 'STOP_LOADING':
       logger.info('STOP_LOADING');
      return { ...state, isLoading: false };
    case 'RESET_UPLOAD_STATE':
        logger.info('RESET_UPLOAD_STATE');
        return { ...state, isLoading: false, totalFileCount: 0, processedFileCount: 0, uploadProgress: null };
    case 'SET_BATTERIES':
      logger.info('SET_BATTERIES');
      return { ...state, batteries: action.payload.batteries, rawBatteries: action.payload.rawBatteries };
    case 'SET_CURRENT_BATTERY':
      logger.info(`SET_CURRENT_BATTERY: ${action.payload}`);
      return { ...state, currentBatteryId: action.payload, alerts: [], healthSummary: '' };
    case 'ADD_DATA': {
      const { data, dateContext, isFirstUpload } = action.payload;
      const { batteryId } = data;
      logger.info(`ADD_DATA for battery ${batteryId}`, { isFirstUpload });

      const timeParts = data.timestamp.split(':').map(Number);

      const newTimestamp = new Date(dateContext);
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
             (averagedPoint as any)[key] = newAveragedDataPoint[key];
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
      logger.info('SET_ALERTS', { alerts: action.payload });
      return { ...state, alerts: action.payload };
    case 'SET_HEALTH_SUMMARY':
        logger.info('SET_HEALTH_SUMMARY', { summary: action.payload });
        return { ...state, healthSummary: action.payload };
    case 'CLEAR_BATTERY_DATA': {
      if (!action.payload) return state;
      logger.info(`CLEAR_BATTERY_DATA for: ${action.payload}`);
      const newBatteries = { ...state.batteries };
      delete newBatteries[action.payload];
      const newRawBatteries = { ...state.rawBatteries };
      delete newRawBatteries[action.payload];
      const newCurrentBatteryId = Object.keys(newBatteries)[0] || null;
      return { ...state, batteries: newBatteries, rawBatteries: newRawBatteries, currentBatteryId: newCurrentBatteryId, alerts: [], healthSummary: '' };
    }
     case 'INCREMENT_PROCESSED_COUNT':
      const newProcessedCount = state.processedFileCount + 1;
      logger.info(`INCREMENT_PROCESSED_COUNT: ${newProcessedCount}/${state.totalFileCount}`);
      return { ...state, processedFileCount: newProcessedCount, uploadProgress: (newProcessedCount / state.totalFileCount) * 100 };
    case 'SET_UPLOAD_PROGRESS':
      return { ...state, uploadProgress: action.payload.progress, processedFileCount: action.payload.processed };
    default:
      return state;
  }
};

const parseDateFromFilename = (filename: string): Date | null => {
    // Matches YYYYMMDD-HHMMSS or YYYYMMDD_HHMMSS
    const regex1 = /(\d{4})(\d{2})(\d{2})[-_]?(\d{2})(\d{2})(\d{2})/;
    const match1 = filename.match(regex1);
    if (match1) {
        const [, year, month, day, hour, minute, second] = match1.map(Number);
        return new Date(year, month - 1, day, hour, minute, second);
    }
    
    // Matches YYYY-MM-DD-HH-MM-SS or YYYY-MM-DD_HH-MM-SS
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
  const isProcessingQueue = useRef(false);
  const [previousDataPoint, setPreviousDataPoint] = useState<BatteryDataPointWithDate | null>(null);
  const uploadQueue = useRef<{ file: File; dateContext: Date }[]>([]);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Effect to load API key from localStorage on mount
  useEffect(() => {
    logger.info("useBatteryData hook mounted. Checking for API Key.");
    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey) {
      setApiKey(storedKey);
      logger.info("API Key found in localStorage.");
    } else {
       logger.warn("API Key not found in localStorage.");
    }
  }, []);

  const processFile = async (file: File, dateContext: Date, isFirstUpload: boolean): Promise<boolean> => {
     if (!apiKey) {
      logger.error("PROCESS FILE ABORTED: API Key not available.");
      toast({
        variant: "destructive",
        title: "API Key Required",
        description: "Please set your Gemini API key in the settings before uploading files.",
      });
      return false; 
    }

    try {
        const fileDateContext = parseDateFromFilename(file.name) || dateContext;
        logger.info(`Processing file: ${file.name}`, { 
            filenameDate: parseDateFromFilename(file.name)?.toISOString(),
            contextDate: dateContext.toISOString(),
            finalDate: fileDateContext.toISOString()
        });

        const reader = new FileReader();
        const dataUri = await new Promise<string>((resolve, reject) => {
            reader.onload = e => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        
        logger.info(`File converted to data URI. Calling 'extractDataFromBMSImage' AI flow...`, {filename: file.name});
        const payload = { photoDataUri: dataUri, apiKey };
        const extractedData = await extractDataFromBMSImage(payload);
        logger.info("AI flow 'extractDataFromBMSImage' successful. Extracted data:", extractedData);

        dispatch({ type: 'ADD_DATA', payload: { data: extractedData, dateContext: fileDateContext, isFirstUpload } });
        return true;
    } catch (error: any) {
        logger.error(`Error processing file: ${file.name}`, JSON.stringify(error, null, 2));

        toast({
            variant: 'destructive',
            title: `Error processing ${file.name}`,
            description: `Could not extract data. Check logs for details.`,
            duration: 10000,
        });
        return false;
    }
  }

  const processQueue = useCallback(async () => {
    if (isProcessingQueue.current) {
        logger.info('processQueue called, but already processing.');
        return;
    }
    if (uploadQueue.current.length === 0) {
      if (state.totalFileCount > 0 && state.processedFileCount === state.totalFileCount) {
        logger.info('Upload queue finished.');
        setTimeout(() => {
            dispatch({ type: 'RESET_UPLOAD_STATE' });
            if (state.totalFileCount > 0) {
              toast({ title: 'Upload Complete', description: `${state.totalFileCount} file(s) processed.` });
            }
        }, 1000);
      }
      return;
    }

    isProcessingQueue.current = true;
    const { file, dateContext } = uploadQueue.current[0];
    logger.info(`Processing next item in queue: ${file.name}`);
    const isFirstUpload = state.currentBatteryId === null;

    const success = await processFile(file, dateContext, isFirstUpload);
    dispatch({ type: 'INCREMENT_PROCESSED_COUNT' });

    if (success) {
      uploadQueue.current.shift();
    } else {
      logger.warn('File processing failed, clearing remainder of upload queue and resetting state.');
      uploadQueue.current = [];
    }
    isProcessingQueue.current = false;
    processQueue();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentBatteryId, state.processedFileCount, state.totalFileCount, apiKey]);

  const processUploadedFiles = useCallback((files: File[], dateContext: Date) => {
     if (!apiKey) {
      toast({
        variant: "destructive",
        title: "API Key Not Found",
        description: "Please set your Gemini API key in the settings menu before uploading.",
      });
      logger.error("Upload attempt failed: No API Key is set.");
      return;
    }
    logger.info(`Adding ${files.length} files to the upload queue.`);
    dispatch({ type: 'START_LOADING', payload: { totalFiles: files.length } });
    uploadQueue.current.push(...files.map(file => ({ file, dateContext })));
    
    if (!isProcessingQueue.current) {
        processQueue();
    }
  }, [processQueue, apiKey, toast]);


  const setCurrentBatteryId = useCallback((batteryId: string) => {
    logger.info(`Switching view to battery: ${batteryId}`);
    dispatch({ type: 'SET_CURRENT_BATTERY', payload: batteryId });
    setPreviousDataPoint(null);
  }, []);

  const clearCurrentBatteryData = useCallback((backup: boolean) => {
    if (!state.currentBatteryId) return;
    logger.info(`Clearing data for battery: ${state.currentBatteryId}`, { backup });

    if (backup) {
      const dataToBackup = {
          averagedData: state.batteries[state.currentBatteryId],
          rawData: state.rawBatteries[state.currentBatteryId],
      }
      logger.info('Backing up data for', state.currentBatteryId, dataToBackup);
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

  // Effect for running AI insights when data changes
  useEffect(() => {
    if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
    }

    if (!latestDataPoint) {
      logger.info("AI Insights: Skipping, no latest data point.");
      return;
    }
    if (!apiKey) {
      logger.info("AI Insights: Skipping, no API key available yet.");
      return;
    }
    
    const runAiTasks = async () => {
      logger.info('AI Insights: Starting tasks for battery', latestDataPoint.batteryId);
      try {
        const commonPayload = {
          apiKey,
          batteryId: latestDataPoint.batteryId,
          soc: latestDataPoint.soc,
          voltage: latestDataPoint.voltage,
          current: latestDataPoint.current,
          maxCellVoltage: latestDataPoint.maxCellVoltage ?? null,
          minCellVoltage: latestDataPoint.minCellVoltage ?? null,
          averageCellVoltage: latestDataPoint.avgCellVoltage ?? null,
          cycleCount: latestDataPoint.cycleCount,
        };

        logger.info("AI Insights: Fetching health summary.");
        const healthSummaryPromise = summarizeBatteryHealth(commonPayload);

        const socChanged = previousDataPoint ? Math.abs(latestDataPoint.soc - previousDataPoint.soc) > 2 : true;
        const cellDiffChanged = previousDataPoint ? Math.abs((latestDataPoint.cellVoltageDifference ?? 0) - (previousDataPoint.cellVoltageDifference ?? 0)) > 0.005 : true;
        
        let alertsPromise;
        if (socChanged || cellDiffChanged) {
          logger.info('AI Insights: Significant data change detected, checking for alerts.');
          alertsPromise = displayAlertsForDataDeviations(commonPayload);
        } else {
          logger.info('AI Insights: No significant data change, skipping alert check.');
          alertsPromise = Promise.resolve(undefined);
        }

        const [healthResult, alertsResult] = await Promise.all([healthSummaryPromise, alertsPromise]);
        
        if (healthResult?.summary) {
            if(healthResult.summary !== state.healthSummary) {
                logger.info('AI Insights: New health summary received.');
                dispatch({ type: 'SET_HEALTH_SUMMARY', payload: healthResult.summary });
            } else {
                 logger.info('AI Insights: Health summary is unchanged.');
            }
        }
        
        if (alertsResult?.alerts) {
            if (JSON.stringify(alertsResult.alerts) !== JSON.stringify(state.alerts)) {
                logger.info('AI Insights: New alerts received.', { alerts: alertsResult.alerts });
                dispatch({ type: 'SET_ALERTS', payload: alertsResult.alerts });
                if (alertsResult.alerts.length > 1) {
                    logger.info("AI Insights: Generating alert summary.");
                    generateAlertSummary({alerts: alertsResult.alerts, apiKey });
                }
            } else {
                 logger.info('AI Insights: Alerts are unchanged.');
            }
        }
        
        setPreviousDataPoint(latestDataPoint);
        
      } catch (error: any) {
        logger.error("AI Insights: Error running tasks:", error);
      } finally {
        logger.info('AI Insights: Tasks finished.');
      }
    };
    
    aiTimeoutRef.current = setTimeout(runAiTasks, 1500);

    return () => {
        if(aiTimeoutRef.current) {
            clearTimeout(aiTimeoutRef.current);
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestDataPoint, apiKey, state.healthSummary, state.alerts, previousDataPoint]);


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
