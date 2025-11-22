import { useState, useEffect, useRef } from 'react';

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
  const startY = useRef(0);
  const currentY = useRef(0);
  const elementRef = useRef(null);

  useEffect(() => {
    if (disabled) return;

    const element = elementRef.current || document.body;
    let touchStartY = 0;
    let isPulling = false;
    let scrollTop = 0;

    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
      scrollTop = element.scrollTop || window.scrollY;
      isPulling = false;
    };

    const handleTouchMove = (e) => {
      const touchY = e.touches[0].clientY;
      const deltaY = touchY - touchStartY;

      // Only allow pull-to-refresh if at the top of the page
      if (scrollTop <= 0 && deltaY > 0 && !isRefreshing) {
        e.preventDefault();
        isPulling = true;
        const distance = Math.min(deltaY / resistance, threshold * 1.5);
        setPullDistance(distance);
        currentY.current = distance;
      } else if (!isPulling) {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (isPulling && pullDistance >= threshold && !isRefreshing) {
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
        // Animate back to 0
        setPullDistance(0);
      }
      isPulling = false;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, threshold, resistance, isRefreshing, onRefresh, disabled]);

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

