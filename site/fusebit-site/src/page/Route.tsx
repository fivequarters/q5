import React, { useEffect } from 'react';
import { Route as ReactRouterRoute, RouteProps } from 'react-router';
import html from '../html';

export const Route = (props: RouteProps) => {
  useEffect(() => {
    if (typeof props.path === 'string' && html[props.path]) {
      document.title = html[props.path].title;
    }
  }, [props.path]);
  return <ReactRouterRoute {...props} />;
};
