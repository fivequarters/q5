import React from 'react';
import styled from 'styled-components';

// -------------------
// Internal Components
// -------------------

const Container = styled.div`
  width: 100%;
`;

// --------------
// Exported Types
// --------------

export type ComponentProps = {
  componentProp?: string;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function Component({ ...props }: ComponentProps) {
  return <Container {...props} />;
}
