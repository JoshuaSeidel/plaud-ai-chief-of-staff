import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for pull-to-refresh functionality
 * @param {Function} onRefresh - Callback function to execute on refresh
 * @param {Object} options - Configuration options
 * @returns {Object} - State and handlers for pull-to-refresh
 */
export function usePullToRefresh(onRefresh, options = {}) {
  const {
    threshold = 80, // Distance in pixels to trigger refresh
    resistance = 2.5, // Resistance factor for pull
    disabled = false
  } = options;

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const elementRef = useRef(null);

  // Keep refs in sync with state
  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);

  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  const checkScrollTop = useCallback(() => {
    // Check if we're at the top of the page
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    return scrollTop <= 5; // Allow small margin for rounding
  }, []);

  useEffect(() => {
    if (disabled || !onRefresh) return;

    let touchStartY = 0;
    let isPulling = false;

    const handleTouchStart = (e) => {
      if (isRefreshingRef.current) return;
      
      touchStartY = e.touches[0].clientY;
      
      // Only start if we're at the top
      if (checkScrollTop()) {
        isPulling = true;
      }
    };

    const handleTouchMove = (e) => {
      if (!isPulling || isRefreshingRef.current) return;
      
      const touchY = e.touches[0].clientY;
      const deltaY = touchY - touchStartY;

      // Only allow pull-to-refresh if at the top and pulling down
      if (deltaY > 0 && checkScrollTop()) {
        e.preventDefault();
        e.stopPropagation();
        const distance = Math.min(deltaY / resistance, threshold * 1.5);
        setPullDistance(distance);
      } else if (deltaY <= 0 || !checkScrollTop()) {
        setPullDistance(0);
        isPulling = false;
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling) {
        setPullDistance(0);
        isPulling = false;
        return;
      }

      const currentDistance = pullDistanceRef.current;
      
      if (currentDistance >= threshold && !isRefreshingRef.current) {
        setIsRefreshing(true);
        setPullDistance(threshold);
        
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh error:', error);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
      
      isPulling = false;
    };

    // Attach to document for better capture
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [threshold, resistance, onRefresh, disabled, checkScrollTop]);

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance >= threshold;

  return {
    pullDistance,
    isRefreshing,
    pullProgress,
    shouldTrigger,
    elementRef
  };
}
