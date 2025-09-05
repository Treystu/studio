"use client";

import React, { useRef, useState } from 'react';
import { Battery, Calendar as CalendarIcon, Loader2, Settings, Trash2, Upload } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import SettingsDialog from './settings-dialog';
import { version } from '../../package.json';

interface DashboardHeaderProps {
  batteryIds: string[];
  currentBatteryId: string | null;
  onBatteryChange: (id: string) => void;
  onFileUpload: (files: File[]) => void;
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  onClearData: (backup: boolean) => void;
  isLoading: boolean;
  hasData: boolean;
  uploadProgress: number | null;
  processedFileCount: number;
  totalFileCount: number;
}

export default function DashboardHeader({
  batteryIds,
  currentBatteryId,
  onBatteryChange,
  onFileUpload,
  selectedDate,
  onDateChange,
  onClearData,
  isLoading,
  hasData,
  uploadProgress,
  processedFileCount,
  totalFileCount,
}: DashboardHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isClearDialogOpen, setClearDialogOpen] = useState(false);
  const [backupData, setBackupData] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onFileUpload(Array.from(event.target.files));
      event.target.value = ''; // Reset file input
    }
  };
  
  const handleClearConfirm = () => {
    onClearData(backupData);
    setClearDialogOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 flex h-auto flex-col border-b bg-card px-4 shadow-sm md:px-6">
      <div className="flex h-16 items-center gap-4">
        <div className="flex items-center gap-3">
          <Battery className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">BatteryView</h1>
          <span className="text-xs font-mono text-muted-foreground pt-1">v{version}</span>
        </div>
        
        <div className="flex w-full items-center justify-end gap-2 md:gap-4">
          {batteryIds.length > 0 && currentBatteryId && (
            <Select onValueChange={onBatteryChange} value={currentBatteryId}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Select Battery" />
              </SelectTrigger>
              <SelectContent>
                {batteryIds.map(id => (
                  <SelectItem key={id} value={id}>{id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                size="sm"
                className={cn(
                  "w-[200px] justify-start text-left font-normal h-9",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={onDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple
            accept="image/*"
          />
          <Button onClick={handleUploadClick} disabled={isLoading || !selectedDate} size="sm" className="h-9">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload Screenshots
          </Button>

          {hasData && (
              <Button variant="destructive" size="icon" onClick={() => setClearDialogOpen(true)} className="h-9 w-9">
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Start Fresh</span>
              </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setSettingsOpen(true)} className="h-9 w-9">
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </div>
      {uploadProgress !== null && (
        <div className="flex items-center gap-3 py-2">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {totalFileCount > 0 ? `Processing ${processedFileCount}/${totalFileCount}...` : 'Processing...'}
          </span>
          <Progress value={uploadProgress} className="h-2 w-full" />
          <span className="text-sm font-mono font-medium text-muted-foreground">{uploadProgress.toFixed(0)}%</span>
        </div>
      )}

      <AlertDialog open={isClearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to start fresh?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all data for battery '{currentBatteryId}'. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center space-x-2 my-4">
            <Switch id="backup-switch" checked={backupData} onCheckedChange={setBackupData} />
            <Label htmlFor="backup-switch">Backup data before deleting</Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearConfirm} className={buttonVariants({variant: 'destructive'})}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SettingsDialog open={isSettingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
}
