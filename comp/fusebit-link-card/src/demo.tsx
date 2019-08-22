import React from 'react';
import ReactDOM from 'react-dom';
import { Box } from '@5qtrs/box';
import { FusebitLinkCard, FusebitLinkCardType } from './FusebitLinkCard';
import RadioCassette from '../assets/img/radio-cassette.png';

const title = 'A title for this link card';
const subtitle = 'And a subtitle for this link card that goes on a bit more';
const summary =
  'Lastly, here is a summary that discusses in some detail what this is all about or what it is not about';

const App = () => (
  <Box vertical gap={20} margin={-20} padding={20} width="100vw" maxWidth={800}>
    <FusebitLinkCard
      title={title}
      subtitle={subtitle}
      summary={summary}
      imageSrc={RadioCassette}
      type={FusebitLinkCardType.small}
      maxWidth={380}
    />
    <FusebitLinkCard
      title={title}
      subtitle={subtitle}
      summary={summary}
      imageSrc={RadioCassette}
      type={FusebitLinkCardType.small}
    />
    <FusebitLinkCard
      title={title}
      subtitle={subtitle}
      summary={summary}
      imageSrc={RadioCassette}
      type={FusebitLinkCardType.medium}
    />
    <FusebitLinkCard title={title} subtitle={subtitle} summary={summary} imageSrc={RadioCassette} />
  </Box>
);

ReactDOM.render(<App />, document.getElementById('app'));
