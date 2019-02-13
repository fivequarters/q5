import React from 'react';
import styled from 'styled-components';
import { Section } from './Section';
import { Bio } from './Bio';
import { BiosData } from '../data/BiosData';
import { applyTheme } from '../util';

const Paragraph = styled.div`
  margin-bottom: 100px;
  ${props => applyTheme(props, 'aboutUs', 'paragraph')}
`;

const StyledBio = styled(Bio)`
  margin-bottom: 100px;
`;

export function AboutUs() {
  return (
    <Section id="about_us" title="About Us">
      <Paragraph>
        Prior to co-founding Five Quarters, the team worked together for years on cloud technologies, platforms, and
        products across Microsoft and Auth0. The team is excited to bring their collective experience to collaborate
        again on bringing novel products to the market.
      </Paragraph>
      {BiosData.map((bio: any) => (
        <StyledBio
          key={bio.name}
          name={bio.name}
          title={bio.title}
          description={bio.description}
          image={bio.picture}
          linkedIn={bio.linkedIn}
          twitter={bio.twitter}
        />
      ))}
    </Section>
  );
}
