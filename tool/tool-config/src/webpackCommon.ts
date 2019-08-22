import HtmlWebpackPlugin from 'html-webpack-plugin';
import HtmlWebpackTemplate from 'html-webpack-template';
import { resolve } from 'path';
import { prettifyName } from './prettifyName';

// ------------------
// Internal Functions
// ------------------

function getHtmlBase(packageJson: any) {
  return {
    title: prettifyName(packageJson.name),
    inject: false,
    template: HtmlWebpackTemplate,
    appMountId: 'app',
    filename: 'index.html',
    links: [
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
      { rel: 'mask-icon', href: '/safari-pinned-tab.svg', color: '#fb310a' },
    ],
    meta: [
      { name: 'viewport', content: 'width=device-width, initial-scale=1, user-scalable=no' },
      { name: 'fragment', content: '!' },
      { name: 'msapplication-TileColor', content: '#2b5797' },
      { name: 'theme-color', content: '#ffffff' },
    ],
  };
}

function findExistingMeta(meta: any, existing: any[]) {
  for (const item of existing) {
    if ((meta.name && meta.name === item.name) || (meta.property && meta.property === item.property)) {
      return item;
    }
  }

  return undefined;
}

function applyHtmlOptions(base: any, html: IWebpackHtmlOptions) {
  if (html.title) {
    base.title = html.title;
  }
  if (html.scripts) {
    base.scripts = base.scripts || [];
    base.scripts.push(...html.scripts);
  }

  if (html.meta) {
    base.meta = base.meta || [];
    const toAdd: any[] = [];
    for (const meta of html.meta) {
      const existing = findExistingMeta(meta, base.meta);
      if (existing) {
        existing.content = meta.content;
      } else {
        const clone: any = {};
        if (meta.name) {
          clone.name = meta.name;
        } else if (meta.property) {
          clone.property = meta.property;
        }
        clone.content = meta.content;
        toAdd.push(clone);
      }
    }
    base.meta.push(...toAdd);
  }

  if (html.links) {
    base.links = base.links || [];
    base.links.push(...html.links);
  }

  if (html.bodySnippet) {
    base.bodyHtmlSnippet = html.bodySnippet;
  }
}

function getHtmlPluginOptions(packageJson: any, options?: IWebpackCommonOptions, prod: boolean = false) {
  const htmlPluginOptions: any[] = [];

  if (!options || !options.html) {
    htmlPluginOptions.push(getHtmlBase(packageJson));
  } else {
    for (const fileName in options.html) {
      const html = getHtmlBase(packageJson);
      if (options.html.default) {
        applyHtmlOptions(html, options.html.default);
      }
      applyHtmlOptions(html, options.html[fileName]);
      if (fileName !== 'default') {
        html.filename = `.${fileName}/index.html`;
      }
      htmlPluginOptions.push(html);
    }
  }

  return htmlPluginOptions;
}

function getOutput(packageJson: any, options?: IWebpackCommonOptions, prod: boolean = false) {
  const libraryName = options && options.libraryName ? options.libraryName : '[name]';
  const postfix = options && options.hash ? '.[contenthash]' : '';
  let min = prod && !(options && options.noMin) ? '.min' : '';

  const output: any = {
    filename: `${libraryName}${postfix}${min}.js`,
    path: resolve('dist'),
    publicPath: '/',
  };

  if (options) {
    if (options.globalObject) {
      output.globalObject = options.globalObject;
    }

    if (options.libraryTarget) {
      output.libraryTarget = options.libraryTarget;
    }
  }

  return output;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IWebpackHtmlOptions {
  title?: string;
  scripts?: string[];
  links?: { [index: string]: string }[];
  meta?: { [index: string]: string }[];
  bodySnippet?: string;
}

export interface IWebpackCommonOptions {
  targetNode?: boolean;
  libraryName?: string;
  libraryTarget?: string;
  entry?: string;
  hash?: boolean;
  noMin?: boolean;
  externals?: { [index: string]: string };
  globalObject?: string;
  html?: { [index: string]: IWebpackHtmlOptions };
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
    for (const htmlPluginOption of htmlPluginOptions) {
      plugins.push(new HtmlWebpackPlugin(htmlPluginOption));
    }
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
