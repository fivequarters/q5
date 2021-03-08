import React from 'react';
import {Route as ReactRouterRoute, RouteProps} from 'react-router';

export const Route = ({props, title}: {props: RouteProps, title: string}) => {
  document.title = title;
  return <ReactRouterRoute {...props}/>;
};
