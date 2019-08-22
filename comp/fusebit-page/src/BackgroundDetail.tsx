import React from 'react';
import { Box, BoxProps } from '@5qtrs/box';
import { FusebitColor } from '@5qtrs/fusebit-color';

// -------------------
// Exported Types
// -------------------

export type BackgroundDetailProps = {
  isMobile?: boolean;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function BackgroundDetail({ width, isMobile, ...rest }: BackgroundDetailProps) {
  return (
    <Box width="100%" {...rest}>
      <div style={{ width: '100%', position: 'absolute', top: 0, left: 0, zIndex: -1, overflow: 'hidden' }}>
        <svg
          width="100%"
          viewBox={`0 0 ${isMobile ? 480 : 1600} 752`}
          fill="none"
          style={{ minWidth: isMobile ? undefined : 1200 }}
        >
          <path
            d="M-106.561 -6.56132C-152.643 -52.6432 -152.643 -127.357 -106.561 -173.439L568.133 -848.133C614.214 -894.214 688.928 -894.215 735.01 -848.133L1409.7 -173.439C1455.79 -127.357 1455.79 -52.6432 1409.7 -6.5614L735.01 668.133C688.928 714.214 614.214 714.214 568.133 668.133L-106.561 -6.56132Z"
            fill="url(#background-detail-gradient)"
          />
          <g clipPath="url(#clip0)">
            <path
              opacity="0.2"
              d="M2074.61 -48.9221L1594.25 431.432C1550.09 475.6 1478.5 475.6 1434.33 431.432C1390.17 387.263 1390.17 315.68 1434.33 271.511L1914.69 -208.843C1958.86 -253.011 2030.44 -253.011 2074.61 -208.843C2118.78 -164.674 2118.78 -93.0907 2074.61 -48.9221Z"
              stroke="#A1A1C0"
            />
            <path
              opacity="0.2"
              d="M953.98 431.432C909.812 387.263 909.812 315.68 953.98 271.511L1674.51 -449.02C1718.68 -493.188 1790.26 -493.188 1834.43 -449.02C1878.6 -404.851 1878.6 -333.268 1834.43 -289.099L1113.9 431.432C1069.73 475.6 998.149 475.6 953.98 431.432Z"
              stroke="#A1A1C0"
            />
            <path
              opacity="0.2"
              d="M872.195 191.254L872.188 191.261C829.554 235.418 757.975 235.427 713.803 191.255C669.635 147.086 669.635 75.5026 713.803 31.334L1434.33 -689.197C1478.5 -733.365 1550.09 -733.365 1594.25 -689.197C1638.42 -645.028 1638.42 -573.445 1594.25 -529.276L872.195 191.254Z"
              stroke="#A1A1C0"
            />
            <path
              opacity="0.2"
              d="M1354.08 671.609C1309.91 715.777 1238.33 715.777 1194.16 671.609C1149.99 627.44 1149.99 555.857 1194.16 511.688C1238.33 467.519 1309.91 467.519 1354.08 511.688C1398.25 555.857 1398.25 627.44 1354.08 671.609Z"
              stroke="#A1A1C0"
            />
          </g>
          <defs>
            <linearGradient
              id="background-detail-gradient"
              x1="608"
              y1="-2.5712"
              x2="1198"
              y2="428.429"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" style={{ stopColor: '#F0F7FF', stopOpacity: 1 }} />
              <stop offset="1" style={{ stopColor: '#F0F7FF', stopOpacity: 0 }} />
            </linearGradient>
            <clipPath id="clip0">
              <rect width="1648" height="720" fill="white" transform="translate(-24)" />
            </clipPath>
          </defs>
        </svg>
      </div>
    </Box>
  );
}
