import { Server, IncomingMessage, } from 'http';
import { Socket } from 'net';

import { getWebSocketAccept } from './helpers';
import { SocketterOptions } from './types';

import SimpleSocket from './SimpleSocket';


const socketter = (
  server: Server,
  onConnect: (simpleSocket: SimpleSocket) => any,
  options: SocketterOptions,
) => {
    server.on('upgrade', (req: IncomingMessage, socket: Socket) => {
      const webSocketKey = req.headers['sec-websocket-key'];
      if (!webSocketKey || !/^[+/0-9A-Za-z]{22}==$/.test(webSocketKey)) {
        const errorMessage = 'Missing key or invalid key';
        const abortHeaders = [
          'Connection: close',
          'Content-Type: text/html',
          `Content-Length: ${Buffer.byteLength(errorMessage)}`,
        ];
        return socket.end(
          `HTTP/1.1 400 Bad Request\r\n` +
          abortHeaders.concat('\r\n').join('\r\n') +
          errorMessage
        );
      };
      const webSocketAccept = getWebSocketAccept(webSocketKey);
      const headers = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${webSocketAccept}`,
      ];
      socket.write(headers.concat('\r\n').join('\r\n')); // Opening handshake

      const simpleSocket = new SimpleSocket(socket, options); // creating this instance for higher level of abstraction with easy-to-use API
      onConnect(simpleSocket);

      socket.on('close', (hadError) => {
        simpleSocket.handleClose(hadError ? 1006 : 1000);
      });

      socket.on('data', (chunk: Buffer) => {
        const frameData = simpleSocket._parseFrame(chunk);
        console.log(frameData);
        simpleSocket._handleFrame(frameData);
      });
    });
  }

// module.exports = Socketter;
export default socketter;