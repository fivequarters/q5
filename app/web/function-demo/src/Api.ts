import { Server, RequestListener } from '@5qtrs/server';
import { ApiConfig } from './ApiConfig';
import { router } from './router';

import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';

export class Api extends Server {
  private constructor(requestListener: RequestListener, port: number) {
    super(requestListener, port);
  }

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
    app.use(express.static(path.join(__dirname, '..', 'public')));

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
}
