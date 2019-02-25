import React from 'react';
import styled from 'styled-components';
import { content } from '../content';
import { applyTheme } from '../util';
import { Bio } from './Bio';
import { Section } from './Section';

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
      <Paragraph>{content.aboutUs}</Paragraph>
      {content.bios.map((bio: any) => (
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
