
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { generatePowerRecommendation } from '@/ai/flows/generate-power-recommendation';
import { BrainCircuit, Loader2 } from 'lucide-react';
import type { BatteryDataPointWithDate } from '@/lib/types';

interface PowerRecommendationProps {
  latestDataPoint: BatteryDataPointWithDate;
}

export default function PowerRecommendation({ latestDataPoint }: PowerRecommendationProps) {
  const [recommendation, setRecommendation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const getRecommendation = async () => {
    if (!latestDataPoint) return;

    setIsLoading(true);
    setHasGenerated(true);
    try {
      const result = await generatePowerRecommendation({
          soc: latestDataPoint.soc,
          power: latestDataPoint.power,
          location: "Pahoa, HI", // Hardcoded for now
      });
      setRecommendation(result.recommendation);
    } catch (error) {
      console.error("Failed to generate power recommendation:", error);
      setRecommendation("Could not generate a recommendation at this time.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="animate-fade-in-down shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-7 w-7 text-primary" />
          <div>
            <CardTitle>AI Power Recommendation</CardTitle>
            <CardDescription>Smart advice based on battery status and weather forecasts.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasGenerated ? (
          <div className="text-center">
             <p className="text-sm text-muted-foreground mb-3">Get a power usage recommendation based on the weather.</p>
            <Button onClick={getRecommendation} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Get Recommendation
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-2 pt-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : (
          <p className="text-md">{recommendation}</p>
        )}
      </CardContent>
    </Card>
  );
}
