
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VerboseLoader() {
  const router = useRouter();

  useEffect(() => {
    // Set a flag in localStorage to enable verbose logging
    try {
      localStorage.setItem('verbose_logging', 'true');
      console.log('Verbose logging enabled. Redirecting...');
    } catch (error) {
      console.error('Could not set verbose logging flag:', error);
    }
    
    // Redirect back to the home page
    router.replace('/');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <p className="text-lg text-foreground">Enabling verbose logging and redirecting...</p>
      </div>
    </div>
  );
}
