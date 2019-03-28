import React from 'react';
import styled from 'styled-components';
import { applyTheme } from '../util';

const Container = styled.h3`
  padding: 30px;
  margin-top: 0;
  margin-bottom: 0;
  ${props => applyTheme(props, 'footer')}
`;

const Link = styled.a`
  text-decoration: inherit;
  ${props => applyTheme(props, 'footer', 'link')}
`;

export function Footer() {
  return (
    <Container>
      &copy; 2019{' '}
      <Link href="https://fivequarters.io" target="_blank">
        Five Quarters LLC
      </Link>{' '}
      - All Rights Reserved
    </Container>
  );
}
