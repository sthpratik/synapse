
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  "vus": 10,
  "iterations": 100,
  "thresholds": {
    "http_req_duration": [
      "p(95)<500"
    ]
  }
};




function constructUrl() {

  // id: integer parameter
  const id = Math.floor(Math.random() * (1000 - 1 + 1)) + 1;
  
  const url = new URL('https://jsonplaceholder.typicode.com/posts');
  url.searchParams.append('id', id);
  
  return url.toString();
}


export default function() {
  const url = constructUrl();
  
  const response = http.get(url, {
  "headers": {
    "User-Agent": "Synapse Load Tester"
  }
});
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
