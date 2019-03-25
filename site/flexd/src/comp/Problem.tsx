import FlexdEditor from '../../assets/img/flexd-editor.png';
import FlexdGallery from '../../assets/img/flexd-gallery.png';

import React from 'react';
import styled from 'styled-components';
import { applyTheme } from '../util';
import { Section } from './Section';

const Container = styled.div`
  margin-top: 100px;
  margin-bottom: 100px;
  display: flex;
  flex: 1;
  flex-direction: column;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
`;

const PersonasContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: space-between;
  flex-wrap: wrap;
  align-items: flex-start;
`;

const PersonaContainer = styled.div`
  flex: 1;
  min-width: 300px;
  margin-left: 10px;
  margin-right: 10px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
`;

const PersonaTitle = styled.div` 
  flex: 1;
  padding-bottom: 10px;
  max-width: 300px;
  min-width: 300px;
  ${props => applyTheme(props, 'problem', 'title')}
`;

const PersonaDescription = styled.div` 
  flex: 1;
  max-width 300px;
  min-width: 300px; 
  padding-bottom: 30px;
  ${props => applyTheme(props, 'problem', 'description')}
`;

const Heading = styled.div`
    flex: 1;
    max-width 600px;
    width: 600px;
    margin-bottom: 100px;
    text-align: center;
    ${props => applyTheme(props, 'problem', 'heading')}
`;

export function Problem() {
  return (
    <Section>
      <Container>
        <Heading>
            Keeping up with the demand for customizations and integrations
            in your platform is hard
        </Heading>
        <PersonasContainer>
            <PersonaContainer>
                <PersonaTitle>Product</PersonaTitle>
                <PersonaDescription>
                New integrations and unique requirements our customers are 
                asking for are stuck in the product backlog and never get done
                </PersonaDescription>
            </PersonaContainer>
            <PersonaContainer>
                <PersonaTitle>Sales</PersonaTitle>
                <PersonaDescription>
                Sales cycles take long and opportunities are lost due to missing integrations 
                or custom functionality, and the need to involve Engineering to go the last mile
                </PersonaDescription>
            </PersonaContainer>
            <PersonaContainer>
                <PersonaTitle>Engineering</PersonaTitle>
                <PersonaDescription>
                Stream of custom requirements coming from Sales and Product is impossible to keep up with
                </PersonaDescription>
            </PersonaContainer>
        </PersonasContainer>
      </Container>
    </Section>
  );
}
