/**
 * Common constants used throughout the application
 */

export const API_ENDPOINTS = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  AUTH: '/auth',
  USERS: '/users',
  TRANSACTIONS: '/transactions',
  REPORTS: '/reports',
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
};

export const MESSAGES = {
  SUCCESS: 'Operation successful',
  ERROR: 'An error occurred',
  LOADING: 'Loading...',
};
