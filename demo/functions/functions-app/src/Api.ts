import { RequestListener, Server } from '@5qtrs/server';
import { ApiConfig } from './ApiConfig';
import { router } from './router';

import cookieParser from 'cookie-parser';
import express from 'express';
import createError from 'http-errors';
import logger from 'morgan';
import path from 'path';

export class Api extends Server {
  public static async create(environment: string) {
    const config = await ApiConfig.create(environment);

    const app = express();

    // view engine setup
    app.set('views', path.join(__dirname, '..', 'views'));
    app.set('view engine', 'ejs');

    app.use(logger('dev'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, '..', 'assets')));

    app.use('/', router);

    // catch 404 and forward to error handler
    app.use((req, res, next) => next(createError(404)));

    // error handler
    // app.use((error: Error, req, res, next) => {
    //   // set locals, only providing error in development
    //   res.locals.message = error.message;
    //   res.locals.error = req.app.get('env') === 'development' ? error : {};

    //   // render the error page
    //   res.status(error.status || 500);
    //   res.render('error');
    // });

    return new Api(app, config.port);
  }
  private constructor(requestListener: RequestListener, port: number) {
    super(requestListener, port);
  }
}
