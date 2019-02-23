import { Body } from '@5qtrs/body';
import React from 'react';
import ReactDOM from 'react-dom';
import { ScrollStick } from './ScrollStick';

const App = () => (
  <Body>
    <div style={{ width: '100%', height: 100, padding: 10, backgroundColor: '#AED6F1' }} />
    <ScrollStick useWindowScroll={true}>
      <div style={{ width: '100%', padding: 10, backgroundColor: '#76D7C4' }}>
        <h1>I should stick when you scroll up</h1>
        Note that the content below should not "jump" up, but continue to scroll up naturely.
        <br />
      </div>
    </ScrollStick>
    <div style={{ width: '100%', height: 5000, padding: 10, backgroundColor: '#F9E79F' }}>
      1 <br />
      2 <br />
      3 <br />
      4 <br />
      5 <br />
      6 <br />
      7 <br />
      8 <br />
      9 <br />
      10 <br />
    </div>
  </Body>
);

ReactDOM.render(<App />, document.getElementById('app'));
