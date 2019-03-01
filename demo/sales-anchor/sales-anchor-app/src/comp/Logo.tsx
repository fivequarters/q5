import { TiAnchor } from '@5qtrs/icon';
import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  color: #34495e;
`;

const Product = styled.div`
  display: flex;
  flex-direction: column;
  font-family: 'Raleway', san-serif;
  font-weight: 300;
`;

const ProdutName = styled.div`
  font-size: 28px;
  font-weight: 300;
`;

const ProductTagLine = styled.div`
  font-size: 10px;
  text-align: center;
  color: #c0392b;
`;

export function Logo() {
  return (
    <Container>
      <TiAnchor style={{ fontSize: 40 }} />
      <Product>
        <ProdutName>Sales Anchor</ProdutName>
        <ProductTagLine>Never Let a Sale Drift Away</ProductTagLine>
      </Product>
    </Container>
  );
}
