import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.isDev ? 10000 : config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isDev,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
});

export const authRateLimiter = rateLimit({
  windowMs: config.isDev ? 60000 : config.rateLimit.windowMs,
  max: config.isDev ? 1000 : Math.min(config.rateLimit.max, 100),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isDev,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.',
    },
  },
});
