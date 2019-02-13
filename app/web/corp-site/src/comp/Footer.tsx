import React from 'react';
import styled from 'styled-components';
import { applyTheme } from '../util';

const Container = styled.div`
  padding: 30px;
  ${props => applyTheme(props, 'footer')}
`;

export function Footer() {
  return <Container>© Five Quarters LLC. - All rights reserved.</Container>;
}
