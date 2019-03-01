import React from 'react';
import styled from 'styled-components';

// -------------------
// Internal Components
// -------------------

const Container = styled.div`
  flex: 1;
  padding-top: 20px;
  overflow-y: scroll;
`;

const Heading = styled.div`
  font-family: 'Roboto', san-serif;
  font-size: 15px;
  font-weight: 300;
  color: #34495e;
  margin-left: 80px;
  margin-bottom: 20px;
`;

// --------------
// Exported Types
// --------------

export type MainContentProps = {
  heading: string;
} & React.BaseHTMLAttributes<HTMLDivElement>;

export function MainContent({ heading, children }: MainContentProps) {
  return (
    <Container>
      <Heading>{heading}</Heading>
      {children}
    </Container>
  );
}
