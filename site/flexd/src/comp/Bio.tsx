import { FaLinkedin, FaTwitter } from '@5qtrs/icon';
import { Image } from '@5qtrs/image';
import React from 'react';
import styled from 'styled-components';
import { applyTheme } from '../util';

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-items: center;
`;

const Picture = styled.div`
  flex: 1;
  text-align: center;
  min-width: 200px;
  margin: 20px;
`;

const Content = styled.div`
  flex: 3;
  min-width: 250px;
  @media only screen and (min-width: 600px) {
    min-width: 300px;
  }
`;

const Name = styled.div`
  ${props => applyTheme(props, 'bio', 'name')}
`;

const Title = styled.div`
  margin-top: 10px;
  ${props => applyTheme(props, 'bio', 'title')}
`;

const Contacts = styled.div`
  margin-top: 10px;
  text-align: center;
`;

const Link = styled.a`
  margin: auto 10px;
  text-decoration: inherit;
  cursor: pointer;
  ${props => applyTheme(props, 'bio', 'link')}
`;

const Twitter = styled(FaTwitter)`
  ${props => applyTheme(props, 'bio', 'twitter')}
`;

const LinkedIn = styled(FaLinkedin)`
  ${props => applyTheme(props, 'bio', 'linkedIn')}
`;

const Description = styled.div`
  margin-top: 30px;
  ${props => applyTheme(props, 'bio', 'description')}
`;

export type BioProps = {
  name: string;
  title: string;
  description: string;
  image: string;
  twitter?: string;
  linkedIn?: string;
  imageSize?: number;
} & React.BaseHTMLAttributes<HTMLDivElement>;

export function Bio({ name, title, description, image, imageSize, twitter, linkedIn, ...rest }: BioProps) {
  imageSize = imageSize || 140;

  const linkedInLink = linkedIn ? (
    <Link href={linkedIn} target="_blank">
      <LinkedIn />
    </Link>
  ) : null;

  const twitterLink = twitter ? (
    <Link href={twitter} target="_blank">
      <Twitter />
    </Link>
  ) : null;

  return (
    <Container {...rest}>
      <Picture>
        <Image width={imageSize} height={imageSize} src={image} alt="Profile Picture" />
      </Picture>
      <Content>
        <Name>{name}</Name>
        <Title>{title}</Title>
        <Contacts>
          {linkedInLink}
          {twitterLink}
        </Contacts>
        <Description>{description}</Description>
      </Content>
    </Container>
  );
}
