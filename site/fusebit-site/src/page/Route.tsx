import React, { useEffect } from 'react';
import { Route as ReactRouterRoute, RouteProps } from 'react-router';
// @ts-ignore
import _html from '../config/html.json';
const html: {
  [key: string]: {
    title: string
  }
} = _html;


export const Route = (props: RouteProps) => {
  useEffect(() => {
    if (typeof props.path === 'string' && html[props.path]) {
      document.title = html[props.path].title;
    } else {
      document.title = html.default.title;
    }
  }, [props.path]);
  return <ReactRouterRoute {...props} />;
};
