import test from 'node:test';
import assert from 'node:assert/strict';

import { getApiBaseUrl } from './apiBase.ts';

test('uses explicit Render backend URL when provided', () => {
  assert.equal(
    getApiBaseUrl('https://book-backend.onrender.com/api', {
      VITE_API_URL: 'https://book-backend.onrender.com/api'
    }),
    'https://book-backend.onrender.com'
  );
});

test('falls back to localhost during local development', () => {
  assert.equal(getApiBaseUrl('', {}), 'http://localhost:5000');
});
