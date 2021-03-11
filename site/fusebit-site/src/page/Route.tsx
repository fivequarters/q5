import React, { useEffect } from 'react';
import { Route as ReactRouterRoute, RouteProps } from 'react-router';
import Helmet from 'react-helmet';
// @ts-ignore
import _html from '../config/html.json';

const html: {
  [key: string]: {
    title?: string,
    description?: string
  },
  default: {
    title: string,
    description: string
  }
} = _html;


export const Route = (props: RouteProps) => {
  let title: string = html.default.title;
  let description: string = html.default.description;
  if (typeof props.path === 'string' && html[props.path]) {
    title = html[props.path].title || title;
    description = html[props.path].description || description;
  }

  return <React.Fragment>
    <Helmet>
      <script src="https://www.googleoptimize.com/optimize.js?id=OPT-KBDMH9D"></script> 
      <title>{title}</title>
      <meta name='og:title' content={title} />
      <meta name='twitter:title' content={title} />
      <meta name='description' content={description} />
      <meta name='og:description' content={description} />
      <meta name='twitter:description' content={description} />
    </Helmet>
    <ReactRouterRoute {...props}/>
  </React.Fragment>;
};
