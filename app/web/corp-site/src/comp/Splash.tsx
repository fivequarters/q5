import React from 'react';
import styled from 'styled-components';
import { FadeSequence } from '@5qtrs/fade-sequence';
import { Section } from './Section';
import { applyTheme } from '../util';

const Title1 = styled.div`
  margin-top: 100px;
  width: 500;
  ${props => applyTheme(props, 'splash', 'title1')}
`;

const Title2 = styled.div`
  margin-top: 20px;
  margin-bottom: 100px;
  ${props => applyTheme(props, 'splash', 'title2')}
`;

export function Splash() {
  return (
    <Section>
      <Title1>We're Making SaaS Integrations</Title1>
      <FadeSequence duration={3000} repeat>
        <Title2>More Flexible</Title2>
        <Title2>More Seamless</Title2>
        <Title2>More Reliable</Title2>
        <Title2>More Transparent</Title2>
        <Title2>Just Work Better</Title2>
      </FadeSequence>
    </Section>
  );
}

// export function Splash() {
//   return (
//     <Section>
//       <Container>
//         <Column>
//           <Heading1>We're Making SaaS Integrations</Heading1>
//           <FadeSequence duration={3000}>
//             <Heading2>More Flexible</Heading2>
//             <Heading2>More Seamless</Heading2>
//             <Heading2>More Reliable</Heading2>
//             <Heading2>More Transparent</Heading2>
//             <Heading2>Just Work Better</Heading2>
//           </FadeSequence>
//         </Column>
//         <Column>
//           <StyledImage src={ConnectedSystem} />
//         </Column>
//       </Container>
//     </Section>
//   );
// }
