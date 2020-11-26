const express = require('express');
const api = express();

const queue = [];
let count = 1;

api.get('/', (req, res) => {
    queue.push(count);
    setTimeout(() => { let doneNumber = queue.shift(); console.log(`DONE: request ${doneNumber}...`); }, 10000);

    console.log(`NEW: request ${count}...`);

  res.send('Request ' + count + ' added to queue.');
  count++;
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
api.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
