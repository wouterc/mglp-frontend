// --- Fil: src/components/Tooltip.tsx ---
// @# 2025-09-15 15:15 - Oprettet en genbrugelig Tooltip-komponent.
import React, { useState, ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

function Tooltip({ content, children }: TooltipProps): React.ReactElement {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && content && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs
                     bg-gray-800 text-white text-sm rounded-md shadow-lg p-2 z-10"
        >
          {content}
        </div>
      )}
    </div>
  );
}

export default Tooltip;