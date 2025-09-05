"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Insight } from "@/lib/types";
import { BrainCircuit, Loader2, BatteryWarning, Sun, Droplets, Lightbulb, LucideIcon } from "lucide-react";
import React from "react";

interface FreshInsightsProps {
  insights: Insight[];
  isLoading: boolean;
  onGenerate: () => void;
}

const iconMap: { [key: string]: LucideIcon } = {
    BatteryWarning,
    Sun,
    Droplets,
    Lightbulb,
};

export default function FreshInsights({ insights, isLoading, onGenerate }: FreshInsightsProps) {
  const hasGenerated = insights.length > 0;
  
  const renderContent = () => {
    if (isLoading && !hasGenerated) {
        return (
             <div className="space-y-4 pt-2">
                <div className="space-y-2">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
                 <div className="space-y-2">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
            </div>
        )
    }
    
    if (!hasGenerated) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">Get AI-powered insights and predictions based on the latest data.</p>
          <Button onClick={onGenerate} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
            Generate Fresh Insights
          </Button>
        </div>
      );
    }

    return (
        <Accordion type="single" collapsible defaultValue="item-0" className="w-full">
            {insights.map((insight, index) => {
                const Icon = iconMap[insight.icon] || Lightbulb;
                return (
                    <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger>
                            <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5 text-primary" />
                                <span className="font-semibold text-md">{insight.title}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground pl-10">
                            {insight.explanation}
                        </AccordionContent>
                    </AccordionItem>
                )
            })}
        </Accordion>
    );
  };
  
  return (
    <Card className="animate-fade-in-down shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-7 w-7 text-primary" />
          <div>
            <CardTitle>Fresh AI Insights</CardTitle>
            <CardDescription>Forward-looking advice based on the latest data and forecasts.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
