import React from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { Body } from './Body';

const theme = {
  colors: {
    header: '#76D7C4',
    content: '#F9E79F',
  },
};

const Header = styled.div`
  width: 100%;
  padding: 20px;
  background-color: ${props => props.theme.colors.header};
`;

const Content = styled.div`
  width: 100%;
  height: 5000px;
  padding: 20px;
  font-size: 28px;
  background-color: ${props => props.theme.colors.content};
`;

const App = () => (
  <Body theme={theme}>
    <Header>
      <h1>There should be no body margin</h1>
    </Header>
    <Content>And theme colors should have been applied</Content>>
  </Body>
);

ReactDOM.render(<App />, document.getElementById('app'));
