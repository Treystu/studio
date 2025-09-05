
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { logger } from '@/lib/logger';

type UrlImporterProps = {
  onImport: (urls: string[]) => void;
};

export function UrlImporter({ onImport }: UrlImporterProps) {
  const [urls, setUrls] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleImport = () => {
    logger.log("Importing URLs...");
    const urlList = urls.split('\n').filter(url => url.trim() !== '');
    onImport(urlList);
    setUrls('');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Import from URLs</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import from URLs</DialogTitle>
          <DialogDescription>
            Paste the URLs of your BMS screenshots, one per line.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.png"
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            rows={10}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleImport}>Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
