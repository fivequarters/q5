import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { FusebitHeroGraphic } from './FusebitHeroGraphic';

const App = () => {
  const [reset, setReset] = useState(false);

  function onClick() {
    setReset(true);
    setTimeout(() => setReset(false), 10);
  }
  return (
    <>
      <div style={{ border: '1px solid black', width: 40, padding: 15 }} onClick={onClick}>
        Reset
      </div>
      <FusebitHeroGraphic reset={reset} width={800} />
    </>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
