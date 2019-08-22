import React, { useState, useLayoutEffect } from 'react';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { Box, BoxProps } from '@5qtrs/box';

// ------------------
// Internal Constants
// ------------------

const maxRadius = 75;
const maxLength = 450;
const centers = [80 * 1 + 75 * 1, 80 * 2 + 75 * 3, 80 * 3 + 75 * 5, 80 * 4 + 75 * 7];
const circles = [
  [true, false, true, false],
  [true, false, false, false],
  [false, false, false, true],
  [false, true, false, true],
];
const xConnections = [[0, 0, 1.5, 0], [1, 0, 0, 0], [0, 0, 0, -1], [0, -1.5, 0, 0]];

// --------------
// Exported Types
// --------------

export type FusebitSpinnerProps = {
  size?: number;
  stop?: boolean;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitSpinner({ size, color, background, expand, stop, ...rest }: FusebitSpinnerProps) {
  const [frame, setFrame] = useState(0);
  color = color || FusebitColor.white;
  background = background || FusebitColor.red;
  size = !expand && !size ? 100 : size;

  const maxFrame = 200;
  const radiusRate = 3;
  const lengthRate = 5;

  useLayoutEffect(() => {
    let animationFrame: number;
    if (!stop || frame < maxFrame) {
      animationFrame = window.requestAnimationFrame(() => setFrame(frame === maxFrame ? 0 : frame + 1));
    }
    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [frame]);

  const radiusFrame = frame * radiusRate;
  const radius = radiusFrame > maxRadius ? maxRadius : radiusFrame;

  const lengthFrame = (radiusFrame - maxRadius) * lengthRate;
  const length = radius < maxRadius ? 0 : lengthFrame > maxLength ? maxLength : lengthFrame;

  function paintCircles() {
    const elements: any = [];
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++)
        if (circles[x][y]) {
          elements.push(<circle key={`circle-${x}-${y}`} cx={centers[y]} cy={centers[x]} r={radius} fill={color} />);
        }
    }
    return elements;
  }

  function paintXConnections() {
    const elements: any = [];
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        if (xConnections[x][y] !== 0) {
          const rectX = centers[y] - radius;
          const rectY = xConnections[x][y] > 0 ? centers[x] : centers[x] + xConnections[x][y] * length;
          const width = radius * 2;
          const height = Math.abs(xConnections[x][y] * length);
          elements.push(<rect key={`rect-${x}-${y}`} x={rectX} y={rectY} width={width} height={height} fill={color} />);

          const cX = centers[y];
          const cY = centers[x] + xConnections[x][y] * length;
          elements.push(<circle key={`circle-${x}-${y}`} cx={cX} cy={cY} r={radius} fill={color} />);
        }
      }
    }
    return elements;
  }

  return (
    <Box center middle expand={!size} {...rest}>
      <svg width={size || '100%'} height={size || '100%'} viewBox="0 0 1000 1000" fill="none">
        <g transform="translate(500,0)">
          <g transform="rotate(45)">
            <g transform="scale(.7,.7)">
              <path
                d="M1000 80C1000 35.8 964.2 0 920 0L80 0C35.8 0 0 35.8 0 80L0 920C0 964.2 35.8 1000 80 1000L920 1000C964.2 1000 1000 964.2 1000 920L1000 80z"
                fill={background}
              />
              {paintCircles()}
              {paintXConnections()}
            </g>
          </g>
        </g>
      </svg>
    </Box>
  );
}
