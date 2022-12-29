"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("./helpers");
const SimpleSocket_1 = require("./SimpleSocket");
const socketter = (server, onConnect, options) => {
    server.on('upgrade', (req, socket) => {
        const webSocketKey = req.headers['sec-websocket-key'];
        if (!webSocketKey || !/^[+/0-9A-Za-z]{22}==$/.test(webSocketKey)) {
            const errorMessage = 'Missing key or invalid key';
            const abortHeaders = [
                'Connection: close',
                'Content-Type: text/html',
                `Content-Length: ${Buffer.byteLength(errorMessage)}`,
            ];
            return socket.end(`HTTP/1.1 400 Bad Request\r\n` +
                abortHeaders.concat('\r\n').join('\r\n') +
                errorMessage);
        }
        ;
        const webSocketAccept = (0, helpers_1.getWebSocketAccept)(webSocketKey);
        const headers = [
            'HTTP/1.1 101 Switching Protocols',
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Accept: ${webSocketAccept}`,
        ];
        socket.write(headers.concat('\r\n').join('\r\n')); // Opening handshake
        const simpleSocket = new SimpleSocket_1.default(socket, options); // creating this instance for higher level of abstraction with easy-to-use API
        onConnect(simpleSocket);
        socket.on('close', (hadError) => {
            simpleSocket.handleClose(hadError ? 1006 : 1000);
        });
        socket.on('data', (chunk) => {
            const frameData = simpleSocket._parseFrame(chunk);
            console.log(frameData);
            simpleSocket._handleFrame(frameData);
        });
    });
};
// module.exports = Socketter;
exports.default = socketter;
