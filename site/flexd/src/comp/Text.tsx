import React from 'react';

// --------------
// Exported Types
// --------------

export type TextProps = {
  content: string;
} & React.BaseHTMLAttributes<HTMLSpanElement>;

// -------------------
// Exported Components
// -------------------

export function Text({ content, ...rest }: TextProps) {
  const items = content.split('\n').map((item, index) => <div key={index}>{item}</div>);
  return <span {...rest}>{items}</span>;
}
