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
      {/* Google Optimize Async Tag */}
      <script src="https://www.googleoptimize.com/optimize.js?id=OPT-KBDMH9D"></script> 
      
      {/* Google Optimize No-Flicker Tag */}
      <style>{".async-hide { opacity: 0 !important} "}</style>
      <script>{"(function(a,s,y,n,c,h,i,d,e){s.className+=' '+y;h.start=1*new Date;h.end=i=function(){s.className=s.className.replace(RegExp(' ?'+y),'')};(a[n]=a[n]||[]).hide=h;setTimeout(function(){i();h.end=null},c);h.timeout=c;})(window,document.documentElement,'async-hide','dataLayer',4000,{'OPT-KBDMH9D':true});"}</script>

      {/* Google Optimize Event Activate */}
      <script>{"window.dataLayer = window.dataLayer || []; if (MutationObserver) { new MutationObserver(function(){ dataLayer.push({'event': 'optimize.activate'}); }).observe(document.body, {subtree: true, attributes: true, characterData: true}); } "}</script>
 
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
