const http = require('http');
const { Socketter } = require('./dist/index.js');


const server = http.createServer().listen(8080);


const socketter = new Socketter(server);

socketter.addEventListener('data', (socket, data) => {
  console.log(data);
})
socketter.handleData = (data) => {
  console.log('data', data);
}