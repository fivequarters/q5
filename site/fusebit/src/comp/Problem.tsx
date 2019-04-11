import React from 'react';
import styled from 'styled-components';
import { applyTheme } from '../util';
import { Section } from './Section';

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
`;

const PersonasContainer = styled.div`
  display: flex;
  flex-basis: auto;
  flex-direction: row;
  justify-content: center;
  flex-wrap: wrap;
  align-items: flex-start;
`;

const PersonaContainer = styled.div`
  flex: 1;
  min-width: 300px;
  max-width: 300px;
  margin-right: 20px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
`;

const PersonaTitle = styled.h2`
  flex: 1;
  padding-bottom: 10px;
  margin-top: 0;
  margin-bottom: 0;
  ${props => applyTheme(props, 'problem', 'title')}
`;

const PersonaDescription = styled.h3`
  flex: 1;
  padding-bottom: 30px;
  margin-top: 0;
  margin-bottom: 0;
  ${props => applyTheme(props, 'problem', 'description')}
`;

const Heading = styled.h1`
    flex-basis: 0;
    max-width 800px;
    margin-top: 0;
    margin-bottom: 70px;
    text-align: center;
    ${props => applyTheme(props, 'problem', 'heading')}
`;

export function Problem() {
  return (
    <Section>
      <Container>
        <Heading>Keeping up with the demand for customizations and integrations in your platform is hard</Heading>
        <PersonasContainer>
          <PersonaContainer>
            <PersonaTitle>Product</PersonaTitle>
            <PersonaDescription>
              New integrations and unique requirements our customers are asking for are stuck in the product backlog and
              never get done
            </PersonaDescription>
          </PersonaContainer>
          <PersonaContainer>
            <PersonaTitle>Sales</PersonaTitle>
            <PersonaDescription>
              Sales cycles take long and opportunities are lost due to missing integrations or custom functionality, and
              the need to involve Engineering to go the last mile
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
