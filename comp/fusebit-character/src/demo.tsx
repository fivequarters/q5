import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Box } from '@5qtrs/box';
import { FusebitCharacter, FusebitCharacterType, FusebitCharacterFace } from './index';

const App = () => {
  const [index, setIndex] = useState(0);

  function createOnClick(index: number) {
    return function onClick() {
      setIndex(index);
    };
  }

  return (
    <Box gap={50}>
      <FusebitCharacterFace
        characterType={FusebitCharacterType.manOne}
        active={index === 0}
        onClick={createOnClick(0)}
      />
      <FusebitCharacterFace
        characterType={FusebitCharacterType.womanOne}
        active={index === 1}
        onClick={createOnClick(1)}
      />
      <FusebitCharacterFace
        characterType={FusebitCharacterType.manTwo}
        active={index === 2}
        onClick={createOnClick(2)}
      />
      <FusebitCharacter characterType={FusebitCharacterType.manOne} />
      <FusebitCharacter characterType={FusebitCharacterType.womanOne} />
      <FusebitCharacter characterType={FusebitCharacterType.manTwo} />
    </Box>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
