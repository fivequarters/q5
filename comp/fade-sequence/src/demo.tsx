import React from 'react';
import ReactDOM from 'react-dom';
import { FadeSequence } from './FadeSequence';

const App = () => (
  <>
    <h1>The following 4 frames will fade in and out and then stop:</h1>
    <FadeSequence duration={2000}>
      <h1>Frame 1</h1>
      <h1>Frame 2</h1>
      <h1>Frame 3</h1>
      <h1>Frame 4</h1>
    </FadeSequence>
    <h1>The following 4 frames will fade in and out forwever:</h1>
    <FadeSequence duration={2000} repeat={true}>
      <h1>Frame 1</h1>
      <h1>Frame 2</h1>
      <h1>Frame 3</h1>
      <h1>Frame 4</h1>
    </FadeSequence>
  </>
);

ReactDOM.render(<App />, document.getElementById('app'));
