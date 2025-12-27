import { useEffect, useRef } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export const useSwipeGesture = (element: React.RefObject<HTMLElement>, handlers: SwipeHandlers) => {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    const el = element.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const diffX = touchStartX.current - touchEndX;
      const diffY = touchStartY.current - touchEndY;

      // Only recognize swipe if horizontal movement is significantly larger than vertical
      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > 50) { // Minimum 50px swipe distance
          if (diffX > 0 && handlers.onSwipeLeft) {
            handlers.onSwipeLeft();
          } else if (diffX < 0 && handlers.onSwipeRight) {
            handlers.onSwipeRight();
          }
        }
      }
    };

    el.addEventListener('touchstart', handleTouchStart, false);
    el.addEventListener('touchend', handleTouchEnd, false);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart, false);
      el.removeEventListener('touchend', handleTouchEnd, false);
    };
  }, [element, handlers.onSwipeLeft, handlers.onSwipeRight]);
};
