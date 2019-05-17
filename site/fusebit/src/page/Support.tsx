import React from 'react';
import { Section } from '../comp/Section';
import styled from 'styled-components';
import { applyTheme } from '../util';

const Heading = styled.h1`
    max-width 800px;
    margin: 0 auto 70px auto;
    text-align: center;
    ${props => applyTheme(props, 'support', 'heading')}
`;

const StyledSection = styled(Section)`
  ${props => applyTheme(props, 'support')}
`;

const Column = styled.div`
  width: 100%;
`;

const ColumnLeft = styled.div`
  width: 100%;
  text-align: left;
`;

const StyledText = styled.p`
  ${props => applyTheme(props, 'support', 'body')}
`;

// -------------------
// Exported Components
// -------------------

export function Support() {
  return (
    <StyledSection>
      <Column>
        <Heading>Support</Heading>
        <ColumnLeft>
          <StyledText>
            System status and uptime: <a href="http://status.fusebit.io">http://status.fusebit.io</a>
          </StyledText>
          <ul>
            <li>
              <StyledText>
                To initiate a support request, please contact us <a href="https://fusebitio.slack.com">via Slack</a> or{' '}
                <a href="mailto:support@fusebit.io">email</a>
              </StyledText>
            </li>
            <li>
              <StyledText>
                For information on the Fusebit support program, please review{' '}
                <a href="https://cdn.fusebit.io/assets/legal/SupportProgram-v1.0.1.pdf">Support Program</a>
              </StyledText>
            </li>
          </ul>
        </ColumnLeft>
      </Column>
    </StyledSection>
  );
}
