"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { version } from '../../../package.json';
import { useBatteryData } from "@/hooks/use-battery-data";
import { logger } from "@/lib/logger";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const API_KEY_STORAGE_KEY = "gemini_api_key";

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const { toast } = useToast();
  const batteryDataState = useBatteryData();

  useEffect(() => {
    if (open) {
      const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
      if (storedKey) {
        setApiKey(storedKey);
      }
    }
  }, [open]);

  const handleSave = () => {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    
    toast({
      title: "API Key Saved",
      description: "The page will now reload to apply the new API key.",
    });

    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const handleDownloadDiagnostics = () => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      version,
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
      appState: { ...batteryDataState, processUploadedFiles: 'function', setCurrentBatteryId: 'function', clearCurrentBatteryData: 'function' },
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
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your application settings and API keys here.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="api-key" className="text-right">
              Gemini API Key
            </Label>
            <Input
              id="api-key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="col-span-3"
              type="password"
            />
          </div>
        </div>
        <DialogFooter className="sm:justify-between border-t pt-4">
          <Button variant="outline" onClick={handleDownloadDiagnostics}>Download Diagnostics</Button>
          <Button onClick={handleSave}>Save and Reload</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
