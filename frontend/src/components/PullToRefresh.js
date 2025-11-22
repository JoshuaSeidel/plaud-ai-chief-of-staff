import React from 'react';
import { usePullToRefresh } from '../utils/usePullToRefresh';

/**
 * Pull-to-refresh wrapper component
 * Shows visual feedback when user pulls down to refresh
 */
export function PullToRefresh({ onRefresh, children, disabled = false, style = {} }) {
  const { pullDistance, isRefreshing, pullProgress, elementRef } = usePullToRefresh(onRefresh, { disabled });

  const indicatorStyle = {
    position: 'fixed',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 1000,
    transition: pullDistance > 0 ? 'none' : 'transform 0.3s ease-out',
    transform: `translateX(-50%) translateY(${Math.max(0, pullDistance - 60)}px)`,
    opacity: pullProgress
  };

  const spinnerStyle = {
    width: '24px',
    height: '24px',
    border: '3px solid rgba(96, 165, 250, 0.3)',
    borderTop: '3px solid #60a5fa',
    borderRadius: '50%',
    animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none'
  };

  return (
    <div ref={elementRef} style={style}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      {pullDistance > 10 && (
        <div style={indicatorStyle}>
          {isRefreshing ? (
            <div style={spinnerStyle} />
          ) : (
            <div style={{ 
              color: '#60a5fa', 
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ transform: `rotate(${pullProgress * 180}deg)`, transition: 'transform 0.1s' }}>
                ↓
              </span>
              {pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

