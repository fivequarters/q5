import { FadeSequence } from '@5qtrs/fade-sequence';
import React from 'react';
import styled from 'styled-components';
import { content } from '../content';
import { applyTheme } from '../util';
import { Section } from './Section';

const Title = styled.div`
  margin-top: 80px;
  width: 500;
  ${props => applyTheme(props, 'splash', 'title')}
`;

const Revolving = styled.div`
  margin-top: 20px;
  margin-bottom: 100px;
  ${props => applyTheme(props, 'splash', 'revolving')}
`;

export function Splash() {
  return (
    <Section>
      <Title>{content.splash.message}</Title>
      <FadeSequence duration={3000} repeat={true}>
        {content.splash.revolving.map(item => (
          <Revolving key={item}>{item}</Revolving>
        ))}
      </FadeSequence>
    </Section>
  );
}
