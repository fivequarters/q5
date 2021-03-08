import React from 'react';
import {Route as ReactRouterRoute, RouteProps} from 'react-router';

export const Route = ({title, ...props}: {title: string} & RouteProps) => {
  document.title = title;
  return <ReactRouterRoute {...props}/>;
};
