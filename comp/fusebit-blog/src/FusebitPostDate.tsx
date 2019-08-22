import React from 'react';
import { FusebitText, FusebitTextType, FusebitTextWeight, FusebitTextProps } from '@5qtrs/fusebit-text';

// ------------------
// Internal Constants
// ------------------

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// ------------------
// Internal Functions
// ------------------

function getDate(year: number, month: number, day: number) {
  return `${months[month - 1]} ${day}, ${year}`;
}

// --------------
// Exported Types
// --------------

export type FusebitPostDateProps = {
  label?: string;
  year: number;
  month: number;
  day: number;
} & FusebitTextProps;

// -------------------
// Exported Components
// -------------------

export function FusebitPostDate({ label, year, month, day, ...rest }: FusebitPostDateProps) {
  label = label || 'Posted on';

  return (
    <FusebitText type={FusebitTextType.bodySmall} {...rest}>
      {label} {getDate(year, month, day)}
    </FusebitText>
  );
}
