const http = require('http');
const { socketter } = require('./dist/index.js');


const server = http.createServer().listen(8080);
console.log('running test....');

socketter(server, (socket) => {
  // setTimeout(() => socket.sendPing(Buffer.alloc(2).fill('a')), 1000);
  socket.addEventListener('data', (data) => {
    console.log(data);
    // socket.close(1001);
    // socket.sendMessage('This is an echo of your message: ' + data);
    
  })
},);

// socketter.addEventListener('data', (socket, data) => {
//   console.log(data);
// })
// socketter.handleData = (data) => {
//   console.log('data', data);
// }
// server.on('upgrade', (h, s, head) => {})