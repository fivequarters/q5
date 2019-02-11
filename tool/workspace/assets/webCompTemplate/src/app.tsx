import React from 'react';
import ReactDOM from 'react-dom';
import { Component } from './Component';

const App = () => (
  <>
    <h1>New Component</h1>
    <Component />
  </>
);

ReactDOM.render(<App />, document.getElementById('app'));
