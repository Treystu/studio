"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import pkg from '../../package.json';
import { useBatteryData } from "@/hooks/use-battery-data";
import { logger } from "@/lib/logger";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Info } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { toast } = useToast();
  const batteryDataState = useBatteryData();

  const handleDownloadDiagnostics = () => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      version: pkg.version,
      verboseLogging: logger.isVerboseEnabled(),
      browser: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          availWidth: window.screen.availWidth,
          availHeight: window.screen.availHeight,
        }
      },
      logs: logger.getLogs(),
      appState: { ...batteryDataState, processUploadedFiles: 'function', setCurrentBatteryId: 'function', clearCurrentBatteryData: 'function', getAiInsights: 'function' },
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(diagnostics, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `diagnostic-data-${new Date().toISOString()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    toast({
        title: "Diagnostics Downloaded",
        description: "The diagnostic file has been saved."
    })
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Application Settings</DialogTitle>
          <DialogDescription>
            Manage application settings and diagnostic data.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>API Key Configuration</AlertTitle>
                <AlertDescription>
                    This application is now configured to use the `GEMINI_API_KEY` environment variable on the server. There is no longer a need to manage the API key in the browser.
                </AlertDescription>
            </Alert>
        </div>
        <DialogFooter className="sm:justify-between border-t pt-4">
          <Button variant="outline" onClick={handleDownloadDiagnostics}>Download Diagnostics</Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
