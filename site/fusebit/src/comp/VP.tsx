import React from 'react';
import styled from 'styled-components';
import { applyTheme } from '../util';
import { Section } from './Section';

const VPContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  max-width: 800px;
`;

const VPTitle = styled.h2`
  flex: 1;
  padding-bottom: 10px;
  margin-top: 0;
  margin-bottom: 0;
  ${props => applyTheme(props, 'vp', 'title')}
`;

const VPDescription = styled.h3`
  flex: 1;
  padding-bottom: 30px;
  margin-top: 0;
  margin-bottom: 0;
  ${props => applyTheme(props, 'vp', 'description')}
`;

export function VP() {
  return (
    <Section>
      <VPContainer>
        <VPTitle>Powerful, efficient, and delightful for your users</VPTitle>
        <VPDescription>
          Removes the friction from satisfying your users’ business requirements. Start with pre-built addons and drop
          to code if needed, all without worrying about infrastructure.
        </VPDescription>
        <VPTitle>Go to market fast and in style</VPTitle>
        <VPDescription>
          Using the Fusebit managed platform with embeddable editor and gallery saves months of development time and
          ongoing maintenance, while providing superior user experience.
        </VPDescription>
        <VPTitle>Reliable, scalable, and secure</VPTitle>
        <VPDescription>
          Build on proven serverless technologies with strong multi-tenant security and reliability guarantees. Minimal
          operational overhead guaranteed.
        </VPDescription>
      </VPContainer>
    </Section>
  );
}
