"use client";

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { generateAlertSummary } from '@/ai/flows/generate-alert-summary';
import { Info } from 'lucide-react';

interface AlertSummaryProps {
  alerts: string[];
}

export default function AlertSummary({ alerts }: AlertSummaryProps) {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getSummary() {
      if (alerts.length <= 1) {
          setIsLoading(false);
          return;
      }
      setIsLoading(true);
      try {
        const result = await generateAlertSummary({ alerts });
        setSummary(result.summary);
      } catch (error) {
        console.error("Failed to generate alert summary:", error);
        setSummary("Could not generate alert summary.");
      } finally {
        setIsLoading(false);
      }
    }
    getSummary();
  }, [alerts]);
  
  if (alerts.length <= 1) return null;

  return (
    <Alert className="animate-fade-in-down mb-3 bg-accent/50">
        <Info className="h-5 w-5" />
        <AlertTitle className="font-bold">AI Alert Summary</AlertTitle>
        <AlertDescription>
        {isLoading ? (
          <div className="space-y-2 pt-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : (
          summary
        )}
        </AlertDescription>
    </Alert>
  );
}
