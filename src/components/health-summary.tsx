"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Lightbulb, Loader2 } from 'lucide-react';
import { useState } from "react";

interface HealthSummaryProps {
  summary: string;
  isLoading: boolean;
  onGenerate: () => void;
}

export default function HealthSummary({ summary, isLoading, onGenerate }: HealthSummaryProps) {
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerate = () => {
    setHasGenerated(true);
    onGenerate();
  }
  
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">AI Health Summary</CardTitle>
        <Lightbulb className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {!hasGenerated && !summary ? (
            <div className="pt-2 text-center">
              <p className="text-sm text-muted-foreground mb-3">Get an AI-powered summary of your battery's health.</p>
              <Button onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generate Summary
              </Button>
            </div>
        ) : isLoading ? (
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground pt-2">
            {summary || "No health summary available."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
