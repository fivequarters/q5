import { shallow } from 'enzyme';
import React from 'react';

import { Image } from '../src';

describe('Image', () => {
  it('should render an image tag with the given source', () => {
    const wrapper = shallow(<Image src="../logo.png" alt="logo" />);
    expect(wrapper.children().length).toBe(0);
    expect(wrapper.html()).toBe('<img src="../logo.png" alt="logo"/>');
  });
});
