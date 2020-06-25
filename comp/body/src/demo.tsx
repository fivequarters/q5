import React from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { Body } from './Body';

const theme = {
  fonts: {
    font1: 'Quicksand',
    font2: {
      name: 'Josefin Sans',
      weight: 700,
    },
  },
  colors: {
    header: '#76D7C4',
  },
};

const Header = styled.div`
  width: 100%;
  padding: 20px;
  font-family: 'Josefin Sans', sans-serif;
  font-weight: 700;
  background-color: ${(props) => props.theme.colors.header};
`;

const Content = styled.div`
  width: 100%;
  padding: 20px;
  font-size: 28px;
  font-family: 'Quicksand', sans-serif;
`;

const App = () => (
  <Body theme={theme} background="#F9E79F">
    <Header>
      <h1>There should be no body margin</h1>
    </Header>
    <Content>And theme colors should have been applied... and fonts from the theme should load!</Content>
  </Body>
);

ReactDOM.render(<App />, document.getElementById('app'));
