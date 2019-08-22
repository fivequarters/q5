import React from 'react';
import { Image } from '@5qtrs/image';
import { FusebitAuthor } from '@5qtrs/fusebit-blog';
import { FusebitSection as Section, FusebitBreak as Break, FusebitQuote as Quote } from '@5qtrs/fusebit-page';
import { FusebitText as Text, FusebitTextType as TextType } from '@5qtrs/fusebit-text';
import { FusebitLink as Link } from '@5qtrs/fusebit-link';
import { FusebitCode as Code, FusebitCodeLanguage as Language } from '@5qtrs/fusebit-code';
import MainImage from '../../../../assets/img/blog-template-main.jpg';

// -------------------
// Exported Components
// -------------------

const meta = {
  postId: 'template',
  title: 'A Blog Post',
  subtitle: 'With a subtitle that really makes you think',
  year: 2019,
  month: 9,
  day: 9,
  summary: [
    'A man at his computer, writing a blog post. His phone rings and he answers.',
    "It's the future calling. The future is here and it is Fusebit.",
  ].join(' '),
  imageSrc: MainImage,
  author: FusebitAuthor.randall,
  shareText: 'A Blog Post - With a subtitle that really makes you think',
};

function Post() {
  return (
    <>
      <Section id="section-1" header="Section Header 1">
        Lorem ipsum dolor sit amet, <Link href="https://www.google.com">consectetur adipiscing elit.</Link>
        <Break />
        <i>Aenean vestibulum nibh diam, et feugiat mauris sagittis sed.</i>
        <Break />
        Mauris finibus tristique leo id posuere. Vivamus pulvinar tortor quis iaculis blandit. Etiam sed tellus dictum,
        ultrices enim in, finibus leo. Proin tincidunt odio non ipsum lacinia luctus. Curabitur dolor eros, pretium et
        mauris ut, cursus ullamcorper urna. Donec sed metus sit amet ante auctor lobortis. Praesent vehicula, risus
        vitae pretium viverra, ex arcu sagittis lectus, sit amet venenatis erat elit sed lectus. Donec vel ligula in
        nulla volutpat tempus id vitae arcu. Pellentesque ut sollicitudin sapien.
        <Break />
        Nulla vitae elit id lorem lacinia suscipit vitae nec mauris. Pellentesque ullamcorper pretium mauris, at
        pharetra nibh faucibus vitae. Sed quam massa, pulvinar in sollicitudin id, tristique eget urna. Donec accumsan
        pellentesque nisl non molestie. Nunc a purus tincidunt, pretium turpis a, egestas nunc.
        <Quote>
          <strong>Cras ut convallis massa.</strong> Nullam fermentum lectus sapien, in convallis augue ornare ac. Nulla
          vulputate laoreet molestie.
        </Quote>
        Vestibulum ullamcorper augue vel volutpat interdum. Phasellus ac sapien sit amet elit molestie bibendum eget
        vitae lacus. Donec eu velit ultricies est rutrum vehicula. In eleifend, sem sit amet venenatis efficitur, dui
        lectus aliquam magna, ac pharetra turpis tortor ut felis. Duis efficitur suscipit sem, eget dignissim lorem
        semper at.
      </Section>
      <Section id="section-2" header="Section Header 2">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean vestibulum nibh diam, et feugiat mauris sagittis
        sed. Mauris finibus tristique leo id posuere. Vivamus pulvinar tortor quis iaculis blandit. Etiam sed tellus
        dictum, ultrices enim in, finibus leo. Proin tincidunt odio non ipsum lacinia luctus. Curabitur dolor eros,
        pretium et mauris ut, cursus ullamcorper urna.
        <Break />
        Donec sed metus sit amet ante auctor lobortis. Praesent vehicula, risus vitae pretium viverra, ex arcu sagittis
        lectus, sit amet venenatis erat elit sed lectus. Donec vel ligula in nulla volutpat tempus id vitae arcu.
        Pellentesque ut sollicitudin sapien. Nulla vitae elit id lorem lacinia suscipit vitae nec mauris. Pellentesque
        ullamcorper pretium mauris, at pharetra nibh faucibus vitae. Sed quam massa, pulvinar in sollicitudin id,
        tristique eget urna. Donec accumsan pellentesque nisl non molestie.
        <Break />
        <Text type={TextType.header4}>Sub Header</Text>
        Nunc a purus tincidunt, pretium turpis a, egestas nunc. Cras ut convallis massa. Nullam fermentum lectus sapien,
        in convallis augue ornare ac. Nulla vulputate laoreet molestie. Vestibulum ullamcorper augue vel volutpat
        interdum. Phasellus ac sapien sit amet elit molestie bibendum eget vitae lacus. Donec eu velit ultricies est
        rutrum vehicula. In eleifend, sem sit amet venenatis efficitur, dui lectus aliquam magna, ac pharetra turpis
        tortor ut felis. Duis efficitur suscipit sem, eget dignissim lorem semper at.
      </Section>
      <Section id="section-3" header="Section Header 3">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean vestibulum nibh diam, et feugiat mauris sagittis
        sed. Mauris finibus tristique leo id posuere. Vivamus pulvinar tortor quis iaculis blandit. Etiam sed tellus
        dictum, ultrices enim in, finibus leo. Proin tincidunt odio non ipsum lacinia luctus. Curabitur dolor eros,
        pretium et mauris ut, cursus ullamcorper urna.
        <Code>
          {`function helloWorld(message) {
  console.log('Hello World and here is my message:', message );
}`}
        </Code>
        Donec sed metus sit amet ante auctor lobortis. Praesent vehicula, risus vitae pretium viverra, ex arcu sagittis
        lectus, sit amet venenatis erat elit sed lectus. Donec vel ligula in nulla volutpat tempus id vitae arcu.
        Pellentesque ut sollicitudin sapien. Nulla vitae elit id lorem lacinia suscipit vitae nec mauris. Pellentesque
        ullamcorper pretium mauris, at pharetra nibh faucibus vitae. Sed quam massa, pulvinar in sollicitudin id,
        tristique eget urna.
        <Break />
        Donec accumsan pellentesque nisl non molestie. Nunc a purus tincidunt, pretium turpis a, egestas nunc. Cras ut
        convallis massa. Nullam fermentum lectus sapien, in convallis augue ornare ac. Nulla vulputate laoreet molestie.
        Vestibulum ullamcorper augue vel volutpat interdum. Phasellus ac sapien sit amet elit molestie bibendum eget
        vitae lacus. Donec eu velit ultricies est rutrum vehicula. In eleifend, sem sit amet venenatis efficitur, dui
        lectus aliquam magna, ac pharetra turpis tortor ut felis. Duis efficitur suscipit sem, eget dignissim lorem
        semper at.
      </Section>
    </>
  );
}

export default { Post, meta };
