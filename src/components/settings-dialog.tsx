"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const API_KEY_STORAGE_KEY = "gemini_api_key";

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const { toast } = useToast();

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
    
    // In a real app, you'd likely want to re-initialize or notify services
    // that use this key. For now, a page reload is a simple way to apply it.
    toast({
      title: "API Key Saved",
      description: "The page will now reload to apply the new API key.",
    });

    setTimeout(() => {
      window.location.reload();
    }, 1500);
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
        <DialogFooter>
          <Button onClick={handleSave}>Save and Reload</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
