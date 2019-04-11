import React from 'react';
import styled from 'styled-components';
import { applyTheme } from '../util';
import { Bio } from './Bio';
import { Section } from './Section';

const InnerContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  max-width: 800px;
`;

const Heading = styled.h1`
    flex: 1;
    max-width 800px;
    margin-top: 0;
    margin-bottom: 30px;
    text-align: center;
    ${props => applyTheme(props, 'bio', 'heading')}
`;

const IntroParagraph = styled.h3`
  flex: 1;
  margin-top: 0;
  margin-bottom: 30px;
  ${props => applyTheme(props, 'bio', 'intro')}
`;

const StyledBio = styled(Bio)`
  margin-bottom: 30px;
`;

import RandallProfilePicture from '../../assets/img/randall.png';
import TomekProfilePicture from '../../assets/img/tomek.png';
import YavorProfilePicture from '../../assets/img/yavor.png';

const bios = [
  {
    name: 'Tomasz Janczuk',
    title: 'Co-founder & CEO',
    picture: TomekProfilePicture,
    twitter: 'https://twitter.com/tjanczuk',
    linkedIn: 'https://www.linkedin.com/in/tjanczuk',
    description: [
      'Tomasz completed his MS in computer science and MBA before dedicating himself full time to',
      'software engineering. After more than a decade at Microsoft and Hewlett-Packard working on',
      'cloud platforms and frameworks, he joined Auth0 to incubate the webtask serverless technology.',
      'Prior to co-founding Fusebit, he led a cross-functional team at Auth0 tasked with defining',
      'and delivering a new SaaS product to the market.',
    ].join(' '),
  },
  {
    name: 'Yavor Georgiev',
    title: 'Co-founder & Head of Product',
    picture: YavorProfilePicture,
    twitter: 'https://twitter.com/YavorGeorgiev',
    linkedIn: 'http://linkedin.com/in/yavorg',
    description: [
      'Yavor runs Product at Fusebit, and spends his time talking to customers, designing features,',
      'and shepherding the product roadmap. Previously, he worked at Auth0, Hulu, and Microsoft, where he',
      'led some early efforts to enable serverless computing on Azure with a focus on mobile developers,',
      'and also worked on open-source frameworks that aim to make the cloud accessible from any platform.',
      'When not enjoying the beauty of the Pacific Northwest, you can usually find him on an ill-advised',
      '(mis)adventure in some remote destination.',
    ].join(' '),
  },
  {
    name: 'Randall Tombaugh',
    title: 'Co-founder & Head of Engineering',
    picture: RandallProfilePicture,
    linkedIn: 'https://www.linkedin.com/in/randall-tombaugh',
    description: [
      'Randall originally received his BS in Political Science and Philosophy before going back to school',
      'to get a second BS in Electrical Engineering. After a few years at Intel, Randall went to Microsoft,',
      'where he wrote software for for the .NET platform and then Azure. Prior to starting Fusebit,',
      'he was managing a team of engineers at Auth0.',
    ].join(' '),
  },
];

export function AboutUs() {
  return (
    <Section>
      <InnerContainer>
        <Heading>About Us</Heading>
        <IntroParagraph>
          Prior to co-founding Fusebit, the team worked together for years on cloud technologies, platforms, and
          products across Microsoft and Auth0. The team is excited to bring their collective experience to collaborate
          again on bringing novel products to the market.
        </IntroParagraph>
        {bios.map((bio: any) => (
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
      </InnerContainer>
    </Section>
  );
}
