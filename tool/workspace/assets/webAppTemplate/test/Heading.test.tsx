import React from 'react';
import { shallow } from 'enzyme';

import { Heading } from '../src/comp';

describe('Heading', () => {
  it('should have a single child text node', () => {
    const wrapper = shallow(<Heading>A Heading</Heading>);
    expect(wrapper.children().length).toBe(1);
    expect(wrapper.childAt(0).text()).toBe('A Heading');
  });
});
