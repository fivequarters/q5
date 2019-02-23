import React from 'react';

// --------------
// Exported Types
// --------------

export type CorpLogoProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function CorpLogo({ size, color, strokeWidth, style, ...rest }: CorpLogoProps) {
  size = size || 50;
  color = color || 'black';
  strokeWidth = strokeWidth || 2;
  style = style || {};
  style.minHeight = size;
  style.minWidth = size;
  return (
    <div {...rest} style={style}>
      <svg width={size} height={size} viewBox="0 0 110 110" xmlns="http://www.w3.org/2000/svg">
        <circle cx="55" cy="55" r="50" fill="transparent" stroke={color} strokeWidth={strokeWidth} />
        <line x1="5" y1="55" x2="105" y2="55" stroke={color} strokeWidth={strokeWidth} />
        <line x1="55" y1="5" x2="55" y2="105" stroke={color} strokeWidth={strokeWidth} />
        <path
          d="M 55 105 A 55 55 0 0 1 105 55 v 50 h -50"
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
        />
      </svg>
    </div>
  );
}
