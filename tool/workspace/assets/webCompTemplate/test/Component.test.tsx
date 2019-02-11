import { shallow } from 'enzyme';
import React from 'react';

import { Component } from '../src';

describe('Component', () => {
  it('should render as a div', () => {
    const wrapper = shallow(<Component />);
    expect(wrapper.children().length).toBe(0);
    expect(wrapper.html()).toBe('<div class="sc-bdVaJa UoSJW"></div>');
  });
});
