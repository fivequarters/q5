import React from 'react';
import styled from 'styled-components';
import { content } from '../content';
import { applyTheme } from '../util';
import { Section } from './Section';

const Logo = styled.a`
  text-decoration: none;
  ${(props) => applyTheme(props, 'products', 'logo')};
`;

const Heading = styled.div`
  ${(props) => applyTheme(props, 'products', 'heading')}
`;

const Description = styled.div`
  ${(props) => applyTheme(props, 'products', 'description')}
`;

const Column = styled.div`
  align-content: center;
`;

const Content = styled.div`
  display: flex;
  flex-direction: row;
`;

export function Products() {
  return (
    <Section id="products" title="Products">
      <Content>
        <Column style={{ flex: 1 }}>
          <Logo href={content.products.link} target="_blank">
            {content.products.name}
          </Logo>
        </Column>
        <Column style={{ flex: 2 }}>
          <Heading>{content.products.heading}</Heading>
          <Description>{content.products.description}</Description>
        </Column>
      </Content>
    </Section>
  );
}
