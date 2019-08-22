import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { FusebitAppLoad } from './index';

const App = () => {
  const [show, setShow] = useState(true);

  setTimeout(() => setShow(false), 5000)

  return (
    <>
      <FusebitAppLoad show={show} />
    </>
  )
};

ReactDOM.render(<App />, document.getElementById('app'));
