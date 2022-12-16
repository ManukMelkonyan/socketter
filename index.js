const http = require('http');
const { handleUpgrade } = require('./handlers');



const server = http.createServer().listen(8080);


const toBin = (chunk) => 
  chunk.reduce((acc, byte) => {
    const parsed = parseInt(byte.toString(), 10).toString(2);
    const bin = '0'.repeat(8 - parsed.length) + parsed;
    return acc + bin;
  }, '');

server.on('upgrade', handleUpgrade);
