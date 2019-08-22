import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Box } from '@5qtrs/box'
import { Fade } from './index';

const App = () => {
  const [show, setShow] = useState(true);

  function onFadeChange() {
    setShow(false);
  }

  return (
    <Box vertical gap={10}>
      <Fade fadeIn={true} show={true} fadeRate={2} onFadeChange={onFadeChange}>
        <h1>I fade in</h1>
      </Fade>
      <Fade fadeOut={true} show={show} fadeRate={0.5}>
        <h1>Then I fade out</h1>
      </Fade>
    </Box>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
