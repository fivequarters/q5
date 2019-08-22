import React from 'react';
import ReactDOM from 'react-dom';
import { Box } from '@5qtrs/box';
import { Body } from '@5qtrs/body';
import { ScrollStick } from './ScrollStick';

const App = () => (
  <Body background="#F9E79F" height={2000}>
    <Box height={100} expand background="#AED6F1" />
    <ScrollStick useWindowScroll>
      <Box vertical padding={20} background="#76D7C4">
        <h1>I should stick when you scroll up</h1>
        Note that the content below should not "jump" up, but continue to scroll up naturally.
      </Box>
    </ScrollStick>
    <Box vertical>
      <Box padding={10}>
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
      </Box>

      <Box width={500} height={300} style={{ overflowY: 'scroll' }}>
        <Box height={100} width="100%" background="#AED6F1" />
        <ScrollStick>
          <Box padding={20} background="#76D7C4">
            <h1>I should also stick when you scroll up</h1>
          </Box>
        </ScrollStick>
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
      </Box>
    </Box>
  </Body>
);

ReactDOM.render(<App />, document.getElementById('app'));
