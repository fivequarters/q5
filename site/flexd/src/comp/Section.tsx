import React from 'react';
import styled from 'styled-components';
import { applyTheme } from '../util';

const Container = styled.div`
  display: flex;
  max-width: 1200px;
  margin: 0px auto;
`;

const Gutter = styled.div`
  min-width: 50px;
  @media only screen and (min-width: 600px) {
    min-width: 100px;
  }
`;

const Title = styled.div`
  padding-top: 120px;
  margin-bottom: 60px;
  ${props => applyTheme(props, 'section', 'title')}
`;

export type SectionProps = {
  title?: string;
} & React.BaseHTMLAttributes<HTMLDivElement>;

export function Section({ title, children, id, ...rest }: SectionProps) {
  return (
    <div id={id}>
      <Container {...rest}>
        <Gutter />
        <div style={{ flex: 1 }}>
          {title ? <Title>{title}</Title> : ''}
          {children}
        </div>
        <Gutter />
      </Container>
    </div>
  );
}
