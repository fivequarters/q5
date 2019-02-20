import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Fade } from './Fade';

const App = () => {
  const [visible, setVisible] = useState(true);

  function onFadeIn() {
    setVisible(false);
  }

  return (
    <>
      <Fade fadeIn={true} visible={true} fadeRate={0.5} onFadeIn={onFadeIn}>
        <h1>I fade in</h1>
      </Fade>
      <Fade fadeOut={true} visible={visible} fadeRate={0.5}>
        <h1>Then I fade out</h1>
      </Fade>
    </>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
