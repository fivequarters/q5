import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Fade } from './Fade';

const App = () => {
  const [visible, setVisible] = useState(true);

  return (
    <>
      <Fade fadeIn visible fadeRate={0.5} onFadeIn={() => setVisible(false)}>
        <h1>I fade in</h1>
      </Fade>
      <Fade fadeOut visible={visible} fadeRate={0.5}>
        <h1>Then I fade out</h1>
      </Fade>
    </>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
