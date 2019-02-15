import React from 'react';
import styled from 'styled-components';

// -------------------
// Internal Components
// -------------------

const Container = styled.div`
  flex: 1;
  padding-top: 20px;
`;

const Heading = styled.div`
  font-family: 'Raleway', san-serif;
  font-size: 26px;
  font-weight: 400;
  text-align: center;
  color: #34495e;
  margin-bottom: 20px;
`;

// --------------
// Exported Types
// --------------

export type MainProps = {
  heading: string;
} & React.BaseHTMLAttributes<HTMLDivElement>;

export function Main({ heading, children }: MainProps) {
  return (
    <Container>
      <Heading>{heading}</Heading>
      {children}
    </Container>
  );
}
