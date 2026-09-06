import express, { Application, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import router from './app/routes';
import { globalErrorHandler } from './app/middlewares/globalErrorHandler';
import notFound from './app/middlewares/notFound';
import passport from 'passport';
import expressSession from 'express-session';
import './app/configs/passport';
import { environmentVariables } from './app/configs/env';
import {
  createRateLimiter,
  lightweightCompression,
  securityHeaders,
} from './app/middlewares/security';
import { isProductionRuntime } from './app/utils/setCookie';

const app: Application = express();
const isProduction = isProductionRuntime();
const allowedOrigins = new Set([
  environmentVariables.FRONTEND_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

app.set('trust proxy', 1);

// parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(securityHeaders);
app.use(lightweightCompression);
app.use(
  createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 300,
    keyPrefix: 'global',
  })
);

app.use(
  expressSession({
    secret: environmentVariables.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === 'null' || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);

//* Application Routes
app.use('/api/v1', router);

//* Basic Route for testing
app.get('/', async (_, res: Response) => {
  res.send({
    status: true,
    message: 'Welcome to Traveler: Your Next Tour Partner 🚀',
  });
});

app.use(globalErrorHandler);

// not found route
app.use(notFound);

export default app;
