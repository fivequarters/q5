import { join } from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import HtmlWebpackTemplate from 'html-webpack-template';

function prettyName(name: string) {
  const index = name.indexOf('/');
  name = index >= 0 ? name.substring(index + 1) : name;
  const characters = name.split('');
  characters[0] = characters[0].toUpperCase();
  for (let i = 1; i < characters.length; i++) {
    if (characters[i - 1] === '-' || characters[i - 1] === '_') {
      characters[i - 1] = ' ';
      characters[i] = characters[i].toUpperCase();
    }
  }
  return characters.join('');
}

export default function webpack(packageJson: any): any {
  const fullName = packageJson.name;
  const title = prettyName(fullName);
  const devServer = packageJson.devServer || { port: 6000 };
  devServer.noInfo = true;
  devServer.historyApiFallback = true;

  return {
    entry: './lib/app.js',
    devtool: 'source-map',
    resolve: {
      extensions: ['.js', '.json'],
    },
    module: {
      rules: [
        {
          test: /\.svg$/,
          use: [{ loader: 'svg-inline-loader' }],
        },
      ],
    },
    output: {
      path: join(__dirname, './dist'),
      filename: 'bundle.js',
    },
    devServer,
    plugins: [
      new HtmlWebpackPlugin({
        title,
        inject: false,
        template: HtmlWebpackTemplate,
        appMountId: 'app',
      }),
    ],
  };
}
