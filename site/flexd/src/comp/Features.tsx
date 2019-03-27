import FlexdEditor from '../../assets/img/flexd-editor.png';
import FlexdGallery from '../../assets/img/flexd-gallery.png';

import React from 'react';
import styled from 'styled-components';
import { applyTheme } from '../util';
// import { Section } from './Section';

const Section = styled.div`
  padding-top: 100px;
  padding-bottom: 100px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-items: center;
  ${props => applyTheme(props, 'feature')}
`;

const Gutter = styled.div`
  min-width: 20px;
  @media only screen and (min-width: 600px) {
    min-width: 100px;
  }
`;

const Column = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
`;

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: space-evenly;
  flex-wrap: wrap;
  align-items: flex-start;
`;

const FeatureContainer = styled.div`
  flex: 1;
  max-width: 1000px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
`;

const FeatureTitle = styled.h3`
  flex: 1;
  padding-bottom: 10px;
  max-width: 500px;
  margin-top: 0;
  margin-bottom: 0;
  ${props => applyTheme(props, 'feature', 'title')}
`;

const FeaturePicture = styled.img`
  flex: 1;
  max-width: 500px;
`;

const FeatureDescription = styled.h3` 
  flex: 1;
  max-width 500px;
  padding: 0px 30px 30px 30px;
  margin-top: 0;
  margin-bottom: 0;
  ${props => applyTheme(props, 'feature', 'description')}
`;

const Heading = styled.h1`
    flex: 1;
    max-width 300px;
    margin-bottom: 30px;
    margin-top: 0;
    text-align: center;
    ${props => applyTheme(props, 'feature', 'heading')}
`;

export function Features() {
  return (
    <Section>
      <Gutter />
      <Column>
        <Heading>Flexd</Heading>
        <Container>
          <FeatureContainer>
            <FeatureTitle>Ultimate customization through code</FeatureTitle>
            <FeaturePicture src={FlexdEditor} />
            <FeatureDescription>
              Embedded scripting environment empowers your customers, sales engineers, and partners to address unique
              customization and integration requirements
            </FeatureDescription>
          </FeatureContainer>
          <FeatureContainer>
            <FeatureTitle>Flexible addons, specific to your platform</FeatureTitle>
            <FeaturePicture src={FlexdGallery} />
            <FeatureDescription>
              Embedded addon framework that accelerates delivery of integrations and extensions in your platform, while
              allowing customization of the last mile through code
            </FeatureDescription>
          </FeatureContainer>
        </Container>
      </Column>
      <Gutter />
    </Section>
  );
}
