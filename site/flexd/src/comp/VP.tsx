import FlexdEditor from '../../assets/img/flexd-editor.png';
import FlexdGallery from '../../assets/img/flexd-gallery.png';

import React from 'react';
import styled from 'styled-components';
import { applyTheme } from '../util';
import { Section } from './Section';

const Container = styled.div`
  margin-top: 100px;
  margin-bottom: 70px;
  max-width: 1000px;
  width: 1000px;
  min-width: 300px;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
`;

const VPContainer = styled.div`
  flex: 1;
  margin-left: 10px;
  margin-right: 10px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
`;

const VPTitle = styled.div` 
  flex: 1;
  padding-bottom: 10px;
  max-width: 800px;
  min-width: 300px;
  ${props => applyTheme(props, 'vp', 'title')}
`;

const VPDescription = styled.div` 
  flex: 1;
  max-width 800px;
  min-width: 300px; 
  padding-bottom: 30px;
  ${props => applyTheme(props, 'vp', 'description')}
`;

export function VP() {
  return (
    <Section>
      <Container>
        <VPContainer>
            <VPTitle>Powerful, efficient, and delightful for your users</VPTitle>
            <VPDescription>Removes the friction from satisfying your users’ business requirements. 
                Start with pre-built addons and drop to code if needed, all without worrying 
                about infrastructure.</VPDescription>
            <VPTitle>Go to market fast and in style</VPTitle>
            <VPDescription>Using the Flexd managed platform with embeddable editor and gallery saves months of 
            development time and ongoing maintenance, while providing superior user experience.</VPDescription>
            <VPTitle>Reliable, scalable, and secure</VPTitle>
            <VPDescription>Build on proven serverless technologies with strong multi-tenant security and 
            reliability guarantees. Minimal operational overhead guaranteed.</VPDescription>
        </VPContainer>
      </Container>
    </Section>
  );
}
