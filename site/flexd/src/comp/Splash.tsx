import React from 'react';
import styled from 'styled-components';
import { applyTheme } from '../util';
import { CTA } from './';

const Section = styled.div`
  display: flex;
  min-width: 100%;
  width: 100%;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  padding-top: 60px;
  padding-bottom: 60px;
  ${props => applyTheme(props, 'splash')}
`;

const Gutter = styled.div`
  min-width: 50px;
  @media only screen and (min-width: 600px) {
    min-width: 100px;
  }
`;

const SplashContainer = styled.div`
  display: flex;
  flex: 1;
  max-width: 1000px;
  width: 1000px;
  flex-direction: row;
  justify-content: space-between;
  flex-wrap: wrap;
  align-items: flex-start;
`;

const MainMessageContainer = styled.div`
  flex: 1;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
`;

const MainMessage = styled.div`
  flex: 1;
  padding-bottom: 30px;
  ${props => applyTheme(props, 'splash', 'mainMessage')}
`;

const SubMessage = styled.div`
  flex: 1;
  padding-bottom: 30px;
  ${props => applyTheme(props, 'splash', 'subMessage')}
`;

export function Splash() {
  return (
    <Section>
      <Gutter />
      <SplashContainer>
        <MainMessageContainer>
          {/* <MainMessage>Integrations<br/>Your Users Want</MainMessage> */}
          <MainMessage>
            Integrations
            <br />
            your users want
          </MainMessage>
          {/* <SubMessage>Improve the stickiness and differentiation of your platform with powerful customizations and integrations</SubMessage> */}
          <SubMessage>
            Accelerate customer acquisition and improve retention in your platform with powerful customizations and
            integrations
          </SubMessage>
        </MainMessageContainer>
        <CTA />
      </SplashContainer>
      <Gutter />
    </Section>
  );
}
