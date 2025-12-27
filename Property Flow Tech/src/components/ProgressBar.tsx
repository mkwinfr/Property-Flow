import React, { useEffect, useState } from 'react';
import './ProgressBar.css';

export const ProgressBar: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Start progress on mount
    setIsVisible(true);
    setProgress(10);

    const timer1 = setTimeout(() => setProgress(30), 100);
    const timer2 = setTimeout(() => setProgress(60), 500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  useEffect(() => {
    // Listen for network activity
    const handleStart = () => {
      setIsVisible(true);
      setProgress(10);
    };

    const handleEnd = () => {
      setProgress(100);
      setTimeout(() => setIsVisible(false), 600);
    };

    window.addEventListener('beforeunload', handleStart);

    return () => {
      window.removeEventListener('beforeunload', handleStart);
    };
  }, []);

  return (
    <div
      className={`progress-bar ${isVisible ? 'visible' : ''} ${
        progress === 100 ? 'complete' : ''
      }`}
      style={{ width: `${progress}%` }}
    />
  );
};

// Helper to trigger progress manually
export const useProgress = () => {
  return {
    complete: () => {
      const bar = document.querySelector('.progress-bar');
      if (bar) {
        bar.classList.add('complete');
        setTimeout(() => {
          bar.classList.remove('complete', 'visible');
        }, 600);
      }
    },
  };
};
