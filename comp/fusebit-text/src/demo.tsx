import React from 'react';
import ReactDOM from 'react-dom';
import { Body } from '@5qtrs/body';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { FusebitText, FusebitTextType, FusebitTextWeight, fusebitFonts } from './FusebitText';

const style = { margin: 15 };

const App = () => (
  <Body fonts={[fusebitFonts]}>
    <FusebitText type={FusebitTextType.header1} style={style}>
      Header 1
    </FusebitText>

    <FusebitText type={FusebitTextType.header1} color={FusebitColor.red} style={style}>
      Header 1 In Red
    </FusebitText>

    <FusebitText type={FusebitTextType.header2} style={style}>
      Header 2 (Body Large below )
    </FusebitText>

    <FusebitText type={FusebitTextType.bodyLarge} style={style}>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse laoreet urna in arcu consectetur, at
      pellentesque nunc mollis. Vestibulum pellentesque ex sed urna rhoncus, a eleifend diam scelerisque. Fusce
      convallis lobortis hendrerit. Vivamus consectetur ipsum metus, sed tincidunt lorem ultricies ut. Donec porta
      tristique nulla, nec scelerisque quam vehicula in. Maecenas maximus ligula in facilisis tempus. Morbi euismod,
      metus eu placerat pellentesque, tortor est cursus ipsum, eget consectetur tortor elit sit amet lacus. Aliquam
      lobortis turpis vitae metus maximus, id posuere quam ullamcorper. Maecenas tortor nibh, rutrum id ultricies eget,
      vehicula id mauris. Sed quis maximus turpis, sit amet convallis ligula. Ut porta velit eget neque malesuada
      tempor. Nam in libero sagittis, ullamcorper urna lobortis, luctus libero. Morbi nisl dui, auctor vel est ut,
      rhoncus interdum tortor.
    </FusebitText>

    <FusebitText type={FusebitTextType.header3} color={FusebitColor.cyan} style={style}>
      Header 3 (Body below)
    </FusebitText>

    <FusebitText style={style}>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse laoreet urna in arcu consectetur, at
      pellentesque nunc mollis. Vestibulum pellentesque ex sed urna rhoncus, a eleifend diam scelerisque. Fusce
      convallis lobortis hendrerit. Vivamus consectetur ipsum metus, sed tincidunt lorem ultricies ut. Donec porta
      tristique nulla, nec scelerisque quam vehicula in. Maecenas maximus ligula in facilisis tempus. Morbi euismod,
      metus eu placerat pellentesque, tortor est cursus ipsum, eget consectetur tortor elit sit amet lacus. Aliquam
      lobortis turpis vitae metus maximus, id posuere quam ullamcorper. Maecenas tortor nibh, rutrum id ultricies eget,
      vehicula id mauris. Sed quis maximus turpis, sit amet convallis ligula. Ut porta velit eget neque malesuada
      tempor. Nam in libero sagittis, ullamcorper urna lobortis, luctus libero. Morbi nisl dui, auctor vel est ut,
      rhoncus interdum tortor.
    </FusebitText>

    <FusebitText type={FusebitTextType.header3} color={FusebitColor.orange} style={style}>
      Header 4 (Body Small below)
    </FusebitText>

    <FusebitText type={FusebitTextType.bodySmall} style={style}>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse laoreet urna in arcu consectetur, at
      pellentesque nunc mollis. Vestibulum pellentesque ex sed urna rhoncus, a eleifend diam scelerisque. Fusce
      convallis lobortis hendrerit. Vivamus consectetur ipsum metus, sed tincidunt lorem ultricies ut. Donec porta
      tristique nulla, nec scelerisque quam vehicula in. Maecenas maximus ligula in facilisis tempus. Morbi euismod,
      metus eu placerat pellentesque, tortor est cursus ipsum, eget consectetur tortor elit sit amet lacus. Aliquam
      lobortis turpis vitae metus maximus, id posuere quam ullamcorper. Maecenas tortor nibh, rutrum id ultricies eget,
      vehicula id mauris. Sed quis maximus turpis, sit amet convallis ligula. Ut porta velit eget neque malesuada
      tempor. Nam in libero sagittis, ullamcorper urna lobortis, luctus libero. Morbi nisl dui, auctor vel est ut,
      rhoncus interdum tortor.
    </FusebitText>

    <FusebitText type={FusebitTextType.bodySmall} weight={FusebitTextWeight.bold} style={style}>
      Body Small in Bold
    </FusebitText>
  </Body>
);

ReactDOM.render(<App />, document.getElementById('app'));
