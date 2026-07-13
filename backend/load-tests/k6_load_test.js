import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // ramp up to 50 users
    { duration: '1m', target: 50 },  // stay at 50 users
    { duration: '30s', target: 100 }, // ramp up to 100 users
    { duration: '1m', target: 100 }, // stay at 100 users
    { duration: '30s', target: 0 },   // scale down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // less than 1% failure rate
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api/v1';

export default function () {
  // 1. Health check endpoint (public)
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  });
  sleep(1);

  // 2. Feed endpoint (public)
  const feedRes = http.get(`${BASE_URL}/posts/feed`);
  check(feedRes, {
    'feed status is 200': (r) => r.status === 200,
  });
  sleep(1);

  // 3. Search endpoint (public/auth simulated - public endpoints bypass auth if desired or mock auth header if needed)
  const searchRes = http.get(`${BASE_URL}/search/documents?q=ai&type=posts`);
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
  });
  sleep(2);
}
