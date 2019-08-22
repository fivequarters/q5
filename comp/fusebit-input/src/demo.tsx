import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Box } from '@5qtrs/box';
import { FusebitButton } from '@5qtrs/fusebit-button';
import { FusebitTextFieldButton, FusebitTextField, FusebitTextArea } from './index';

const App = () => {
  const [validate, setValidate] = useState(false);
  function onTextSubmit(value: string) {
    console.log(value);
  }

  function onClick() {
    setValidate(true);
    setTimeout(() => setValidate(false), 5000);
  }

  return (
    <Box vertical gap={20}>
      <FusebitTextFieldButton
        placeholder="Enter an Email"
        size={40}
        width={520}
        buttonText="Let's Talk"
        onTextSubmit={onTextSubmit}
      />
      <FusebitTextField errorText="This is an Error" invalid={validate} placeholder="Text Input" />
      <FusebitTextArea placeholder="Text Area" />
      <FusebitButton onClick={onClick}>Submit</FusebitButton>
    </Box>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
