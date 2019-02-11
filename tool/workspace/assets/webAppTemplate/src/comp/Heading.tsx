import React from 'react';
import styled from 'styled-components';

// -------------------
// Internal Components
// -------------------

export const Container = styled.div`
  font-family: Verdana, san-serif;
  font-size: 28px;
  font-weight: 300;
  margin: 0px;
  margin-bottom: 20px;
`;

// --------------
// Exported Types
// --------------

export type HeadingProps = {
  componentProp?: string;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function Heading({ children, ...props }: HeadingProps) {
  return <Container {...props}>{children}</Container>;
}
