const http = require("http");
const { socketter } = require("./dist/index.js");

const server = http.createServer().listen(8080);
console.log("running test....");

socketter(server, (socket) => {
  // setTimeout(() => socket.sendPing(Buffer.alloc(2).fill('a')), 1000);
  socket.addEventListener("data", (data) => {
    // console.log(data);
    socket.sendMessage(
      JSON.stringify({
        aaaaaaaaaaaaaaaaa: "aaaaaaaaaaaaaaaaa",
        bbbbbbbbbbbbbbbbb: "bbbbbbbbbbbbbbbbb",
        aaaaaaaaaaaaaaaa2: "aaaaaaaaaaaaaaaaa",
        bbbbbbbbbbbbbbbb3: "bbbbbbbbbbbbbbbbb",
        aaaaaaaaaaaaaaaa4: "aaaaaaaaaaaaaaaaa",
        bbbbbbbbbbbbbbbb5: "bbbbbbbbbbbbbbbbb",
        aaaaaaaaaaaaaaaa6: "aaaaaaaaaaaaaaaaa",
        bbbbbbbbbbbbbbbb7: "bbbbbbbbbbbbbbbbb",
      })
    );
    // socket.sendMessage('This is an echo of your message: ' + data);
  });
});

// socketter.addEventListener('data', (socket, data) => {
//   console.log(data);
// })
// socketter.handleData = (data) => {
//   console.log('data', data);
// }
// server.on('upgrade', (h, s, head) => {})
