import compression from 'compression';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config';
import { errorConverter, errorHandler } from './middlewares/error.middleware';
import { ApiError } from './utils/ApiError';

import routes from './routes/v1';

const app = express();

if (config.env !== 'test') {
  app.use(morgan('combined'));
}

// set security HTTP headers
app.use(helmet());

// parse json request body
app.use(express.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// gzip compression
app.use(compression());

// enable cors
app.use(cors());
// app.options('*', cors());

// limit repeated failed requests to auth endpoints
if (config.env === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    skipSuccessfulRequests: true,
  });
  app.use('/api/v1/auth', limiter);
}

// v1 api routes
app.use('/api/v1', routes);


// send back a 404 error for any unknown api request
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new ApiError(404, 'Not found'));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

export default app;
