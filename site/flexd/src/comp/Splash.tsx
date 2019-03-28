import React from 'react';
import styled from 'styled-components';
import { applyTheme } from '../util';
import { CTA } from './';
import { Section } from './Section';

const StyledSection = styled(Section)`
  ${props => applyTheme(props, 'splash')}
`;

const SplashContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: space-between;
  flex-wrap: wrap;
  align-items: flex-start;
`;

const MainMessageContainer = styled.div`
  flex: 1;
  max-width: 500px;
  min-width: 250px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  margin-right: 30px;
`;

const MainMessage = styled.h1`
  flex: 1;
  padding-bottom: 30px;
  margin: 0;
  ${props => applyTheme(props, 'splash', 'mainMessage')}
`;

const SubMessage = styled.h3`
  flex: 1;
  padding-bottom: 30px;
  margin: 0;
  ${props => applyTheme(props, 'splash', 'subMessage')}
`;

export function Splash() {
  return (
    <StyledSection>
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
    </StyledSection>
  );
}
