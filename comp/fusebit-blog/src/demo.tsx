import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from '@5qtrs/fusebit-link';
import { FusebitPostCard, FusebitAuthor, FusebitPostCardType } from './index';
import RadioCassette from '../assets/img/radio-cassette.png';

const App = () => (
  <BrowserRouter>
    <FusebitPostCard
      type={FusebitPostCardType.small}
      postId="demo"
      title="A Blog Post"
      subtitle="With a subtitle that really makes you think"
      year={2019}
      month={9}
      day={9}
      summary={[
        "Let's set the scene: A man at his computer, writing a blog post. His phone rings and he",
        "answers. It's the future calling. The future is here and it is Fusebit.",
      ].join(' ')}
      imageSrc={RadioCassette}
      author={FusebitAuthor.randall}
    />
  </BrowserRouter>
);

ReactDOM.render(<App />, document.getElementById('app'));
