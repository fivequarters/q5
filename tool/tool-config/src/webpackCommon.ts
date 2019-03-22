import HtmlWebpackPlugin from 'html-webpack-plugin';
import HtmlWebpackTemplate from 'html-webpack-template';
import { resolve } from 'path';
import { prettifyName } from './prettifyName';

// ------------------
// Internal Functions
// ------------------

function getHtmlPluginOptions(packageJson: any, options?: IWebpackCommonOptions, prod: boolean = false) {
  const htmlPluginOptions: any = {
    title: prettifyName(packageJson.name),
    inject: false,
    template: HtmlWebpackTemplate,
    appMountId: 'app',
    links: [
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
      { rel: 'mask-icon', href: '/safari-pinned-tab.svg', color: '#fc4445' },
    ],
    meta: [
      { name: 'viewport', content: 'width=device-width, initial-scale=1, user-scalable=no' },
      { name: 'fragment', content: '!' },
      { name: 'msapplication-TileColor', content: '#2b5797' },
      { name: 'theme-color', content: '#ffffff' },
    ],
  };
  if (options) {
    const html = options.html;
    if (html) {
      if (html.title) {
        htmlPluginOptions.title = html.title;
      }
      if (html.scripts) {
        htmlPluginOptions.scripts = htmlPluginOptions.scripts || [];
        htmlPluginOptions.scripts.push(...html.scripts);
      }
      if (html.meta) {
        htmlPluginOptions.meta = htmlPluginOptions.meta || [];
        htmlPluginOptions.meta.push(...html.meta);
      }
      if (html.links) {
        htmlPluginOptions.links = htmlPluginOptions.links || [];
        htmlPluginOptions.links.push(...html.links);
      }
      if (html.bodySnippet) {
        htmlPluginOptions.bodyHtmlSnippet = html.bodySnippet;
      }
    }
  }

  return htmlPluginOptions;
}

function getOutput(packageJson: any, options?: IWebpackCommonOptions, prod: boolean = false) {
  const libraryName = options && options.libraryName ? options.libraryName : '[name]';
  const postfix = options && options.hash ? '.[contenthash]' : '';
  const min = prod ? '.min' : '';

  const output: any = {
    filename: `${libraryName}${postfix}${min}.js`,
    path: resolve('dist'),
  };

  if (options && options.globalObject) {
    output.globalObject = options.globalObject;
  }

  if (options && options.libraryTarget) {
    output.libraryTarget = options.libraryTarget;
  }

  return output;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IWebpackCommonOptions {
  targetNode?: boolean;
  libraryName?: string;
  libraryTarget?: string;
  entry?: string;
  hash?: boolean;
  externals?: { [index: string]: string };
  globalObject?: string;
  html?: {
    title?: string;
    scripts?: string[];
    links?: { [index: string]: string }[];
    meta?: { [index: string]: string }[];
    bodySnippet?: string;
  };
}

// ------------------
// Exported Functions
// ------------------

export function webpackCommon(packageJson: any, options?: IWebpackCommonOptions, prod: boolean = false): any {
  const htmlPluginOptions = getHtmlPluginOptions(packageJson, options, prod);
  const output = getOutput(packageJson, options, prod);
  const entry = options && options.entry ? options.entry : 'app';
  const externals = options && options.externals ? options.externals : {};
  const targetNode = options && options.targetNode ? options.targetNode : false;

  const plugins = [];
  if (!targetNode) {
    plugins.push(new HtmlWebpackPlugin(htmlPluginOptions));
  }

  return {
    target: targetNode ? 'node' : 'web',
    entry: {
      app: `./lib${targetNode ? 'c' : 'm'}/${entry}.js`,
    },
    resolve: {
      extensions: ['.mjs', '.js', '.jsx'],
    },
    plugins,
    module: {
      rules: [
        {
          test: /\.(png|jpg|jpeg|gif|xml|ico|svg|webmanifest)$/,
          use: ['file-loader?name=[name].[ext]'],
        },
      ],
    },
    externals,
    output,
  };
}
