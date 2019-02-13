import React from 'react';
import styled from 'styled-components';
import { Image } from '@5qtrs/image';
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
  min-width: 300px;
`;

const Content = styled.div`
  flex: 3;
  min-width: 200px;
  @media only screen and (min-width: 600px) {
    min-width: 400px;
  }
`;

const Name = styled.div`
  ${props => applyTheme(props, 'bio', 'name')}
`;

const Title = styled.div`
  margin-top: 10px;
  ${props => applyTheme(props, 'bio', 'title')}
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
  imageSize = imageSize || 200;
  return (
    <Container {...rest}>
      <Picture>
        <Image width={imageSize} height={imageSize} src={image} alt="Profile Picture" />
      </Picture>
      <Content>
        <Name>{name}</Name>
        <Title>{title}</Title>
        <Description>{description}</Description>
      </Content>
    </Container>
  );
}
