
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  "vus": 5,
  "iterations": 20,
  "thresholds": {
    "http_req_duration": [
      "p(95)<300"
    ],
    "http_req_failed": [
      "rate<0.05"
    ]
  }
};




function constructUrl() {

  // userId: integer parameter
  const userId = Math.floor(Math.random() * (10 - 1 + 1)) + 1;

  // category: array parameter
  const categoryValues = ["technology","business","health","sports"];
  const category = categoryValues[Math.floor(Math.random() * categoryValues.length)];

  // format: array parameter
  const formatValues = ["json","xml","csv"];
  const format = formatValues[Math.floor(Math.random() * formatValues.length)];

  // sessionId: string parameter
  const sessionIdCharset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let sessionId = '';
  for (let i = 0; i < 12; i++) {
    sessionId += sessionIdCharset.charAt(Math.floor(Math.random() * sessionIdCharset.length));
  }
  
  const url = new URL('https://jsonplaceholder.typicode.com/posts');
  url.searchParams.append('userId', userId);
  url.searchParams.append('category', category);
  url.searchParams.append('format', format);
  url.searchParams.append('sessionId', sessionId);
  
  return url.toString();
}


export default function() {
  const url = constructUrl();
  
  const response = http.get(url, {
  "headers": {
    "User-Agent": "Synapse Array Test",
    "Accept": "application/json"
  }
});
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
