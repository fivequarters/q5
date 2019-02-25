import React from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import * as Icons from './index';

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
`;

const IconCard = styled.div`
  width: 80px;
  height: 100px;
  text-align: center;
  padding: auto;
  margin-left: 20px;
  font-size: 8px;
`;

const App = () => {
  const names = Object.keys(Icons);
  const icons = names.map((name: string) => {
    // @ts-ignore
    const icon = Icons[name];
    return (
      <IconCard key={name}>
        {React.createElement(icon, { size: 30 })}
        <div>{name}</div>
      </IconCard>
    );
  });

  return (
    <>
      <h1>Icons</h1>
      <Container>{icons}</Container>
    </>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
