import React from 'react';
import styled from 'styled-components';
import { applyTheme } from '../util';

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 100%;
  width: 100%;
  padding-top: 70px;
  padding-bottom: 70px;
`;

const Inner = styled.div`
  display: flex;
  flex: 1;
  max-width: 1000px;
  min-width: 300px;
  margin-left: 30px;
  margin-right: 30px;
  justify-content: center;
`;

export type SectionProps = {} & React.BaseHTMLAttributes<HTMLDivElement>;

export function Section({ children, id, ...rest }: SectionProps) {
  return (
    <Container {...rest} id={id}>
      <Inner>{children}</Inner>
    </Container>
  );
}
