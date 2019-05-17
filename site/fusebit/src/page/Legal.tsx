import React from 'react';
import { Section } from '../comp/Section';
import styled from 'styled-components';
import { applyTheme } from '../util';

const Heading = styled.h1`
    max-width 800px;
    margin: 0 auto 70px auto;
    text-align: center;
    ${props => applyTheme(props, 'legal', 'heading')}
`;

const StyledSection = styled(Section)`
  ${props => applyTheme(props, 'legal')}
`;

const Column = styled.div`
  width: 100%;
`;

const ColumnLeft = styled.div`
  width: 100%;
  text-align: left;
`;

const StyledText = styled.p`
  ${props => applyTheme(props, 'legal', 'body')}
`;

// -------------------
// Exported Components
// -------------------

export function Legal() {
  return (
    <StyledSection>
      <Column>
        <Heading>Legal Terms for Enterprise Subscribers</Heading>
        <ColumnLeft>
          <StyledText>Legal information about the Fusebit service is available here:</StyledText>
          <ul>
            <li>
              <StyledText>
                <a href="https://cdn.fusebit.io/assets/legal/SubscriptionAgreement-v1.0.1.pdf">
                  Subscription Agreement
                </a>
              </StyledText>
            </li>
            <li>
              <StyledText>
                <a href="https://cdn.fusebit.io/assets/legal/AcceptableUsePolicy-v1.0.1.pdf">Acceptable Use Policy</a>
              </StyledText>
            </li>
            <li>
              <StyledText>
                <a href="https://cdn.fusebit.io/assets/legal/ServiceLevelDescription-v1.0.0.pdf">
                  Service Level Description
                </a>
              </StyledText>
            </li>
            <li>
              <StyledText>
                <a href="https://cdn.fusebit.io/assets/legal/Sub-Processors-v1.0.1.pdf">Sub Processors</a>
              </StyledText>
            </li>

            <li>
              <StyledText>
                <a href="https://cdn.fusebit.io/assets/legal/SupportProgram-v1.0.1.pdf">Support Program</a>
              </StyledText>
            </li>
          </ul>
        </ColumnLeft>
      </Column>
    </StyledSection>
  );
}
