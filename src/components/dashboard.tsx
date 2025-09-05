
"use client";

import { useBatteryData } from "@/hooks/use-battery-data";
import DashboardHeader from "@/components/dashboard-header";
import OverviewSection from "@/components/overview-section";
import MetricsSection from "@/components/metrics-section";
import TrendsSection from "@/components/trends-section";
import AlertsSection from "@/components/alerts-section";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Battery } from "lucide-react";
import { useState, useEffect } from "react";
import { differenceInHours, formatDistanceToNow, isSameDay } from "date-fns";
import PowerRecommendation from "@/components/power-recommendation";
import FreshInsights from "./fresh-insights";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    // Initialize date on client to avoid hydration mismatch
    if (typeof window !== 'undefined') {
      setSelectedDate(new Date());
    }
  }, []);
  
  const {
    batteries,
    currentBatteryId,
    setCurrentBatteryId,
    latestDataPoint,
    currentBatteryData,
    currentBatteryRawData,
    processUploadedFiles,
    clearCurrentBatteryData,
    isLoading,
    alerts,
    healthSummary,
    uploadProgress,
    processedFileCount,
    totalFileCount,
    insights,
    getAiInsights,
  } = useBatteryData();

  const handleFileUpload = (files: File[]) => {
    if (selectedDate) {
      processUploadedFiles(files, selectedDate);
    }
  }

  const hasData = Object.keys(batteries).length > 0 && currentBatteryId && batteries[currentBatteryId]?.length > 0;
  
  const isInitialLoading = isLoading && !hasData;

  const isDataFresh = latestDataPoint ? differenceInHours(new Date(), new Date(latestDataPoint.timestamp)) < 12 : false;
  const timeAgo = latestDataPoint ? formatDistanceToNow(new Date(latestDataPoint.timestamp), { addSuffix: true }) : '';

  const renderContent = () => {
    if (isInitialLoading) {
      return (
         <div className="space-y-8">
           <Skeleton className="h-48 w-full" />
           <Skeleton className="h-64 w-full" />
           <Skeleton className="h-96 w-full" />
         </div>
      );
    }
    
    if (!currentBatteryId) {
      return (
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Card className="w-full max-w-md text-center shadow-lg animate-fade-in">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Welcome to BatteryView</CardTitle>
              <CardDescription>Upload your BMS screenshots to get started.</CardDescription>
            </CardHeader>
            <CardContent>
              <Battery className="mx-auto h-24 w-24 text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Click the "Upload Screenshots" button in the header.</p>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    if (!hasData) {
      return (
           <div className="flex items-center justify-center h-[calc(100vh-200px)]">
              <Card className="w-full max-w-md text-center shadow-lg animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">No Data Available</CardTitle>
                  <CardDescription>Upload screenshots for battery '{currentBatteryId}' using the date picker for context.</CardDescription>
                </Header>
                <CardContent>
                  <Battery className="mx-auto h-24 w-24 text-primary mb-4" />
                </CardContent>
              </Card>
            </div>
      );
    }
    
    // Main content when data is available
    return (
        <>
            {isDataFresh && latestDataPoint && (
                <FreshInsights 
                    insights={insights}
                    isLoading={isLoading && insights.length === 0}
                    onGenerate={getAiInsights}
                />
            )}
            
            {isDataFresh && latestDataPoint ? (
              <div className="grid grid-cols-1 gap-8 animate-fade-in">
                <AlertsSection alerts={alerts} />
                <PowerRecommendation latestDataPoint={latestDataPoint} />
                <OverviewSection data={latestDataPoint} healthSummary={healthSummary} isSummaryLoading={isLoading && !healthSummary} onGenerateSummary={getAiInsights} />
                <MetricsSection data={latestDataPoint} />
              </div>
            ) : (
                <Card className="animate-fade-in bg-amber-500/10 border-amber-500/30">
                    <CardContent className="flex items-center gap-3 p-4">
                        <Battery className="h-5 w-5 text-amber-500" />
                        <div>
                            <p className="font-semibold text-amber-700 dark:text-amber-300">Viewing Historical Data</p>
                            <p className="text-sm text-amber-600 dark:text-amber-400">
                                The metrics below are from the last known reading on this day ({timeAgo}).
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
             <TrendsSection data={currentBatteryData} rawData={currentBatteryRawData}/>
        </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <DashboardHeader
        batteryIds={Object.keys(batteries)}
        currentBatteryId={currentBatteryId}
        onBatteryChange={setCurrentBatteryId}
        onFileUpload={handleFileUpload}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onClearData={clearCurrentBatteryData}
        isLoading={isLoading}
        hasData={!!currentBatteryId}
        uploadProgress={uploadProgress}
        processedFileCount={processedFileCount}
        totalFileCount={totalFileCount}
      />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-8">
        {renderContent()}
      </main>
    </div>
  );
}

