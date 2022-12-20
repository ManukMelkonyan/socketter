import { Server, IncomingMessage, } from 'http';
import { Duplex } from 'stream';

import { Opcode } from './constants';
import { unmask, generateMaskKey, getWebSocketAccept, decodePayload } from './helpers';


type DataHandler = {
  (data: Buffer | string): any;
}

type ErrorHandler = {
  (data: Error | string): any;
}

type DataOptions = {
  FIN?: number;
  RSV1?: number;
  RSV2?: number;
  RSV3?: number;
  OPCODE?: number;
  payload: Buffer;
  mask?: boolean;
  maskKey?: Buffer
};

type FrameData = {
  FIN: number;
  RSV1: number;
  RSV2: number;
  RSV3: number;
  OPCODE: Opcode;
  payload: Buffer;
  payloadLength: number;
};

type AccumulatedData = {
  payload?: Buffer;
  type?: Opcode;
}
  
export class Socketter {
  _server: Server;
  handleData: DataHandler;
  handleClose: DataHandler;
  handleError: ErrorHandler;

  constructor (server: Server) {
    this._server = server;
    server.on('upgrade', (req: IncomingMessage, socket: Duplex) => {
      console.log(req.headers);
      const webSocketKey = req.headers['sec-websocket-key'];
      const webSocketAccept = getWebSocketAccept(webSocketKey);
      const headers = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${webSocketAccept}`,
      ];
      socket.write(headers.concat('\r\n').join('\r\n'));
    
      socket.on('close', () => {
        console.log('='.repeat(111));
        console.log('='.repeat(111));
        console.log('Connection closed');
        console.log('='.repeat(111));
        console.log('='.repeat(111));
      });
    
      // setTimeout(() => sendPing(socket, { payload: Buffer.from('hello') }), 2000);
      socket.on('data', (chunk) => {
        const accumulatedData: AccumulatedData = {};
        const frameData = this._parseFrame(chunk);
        this._handleFrame(socket, frameData, accumulatedData);
        
        console.log(frameData);
        // socket.end();
      })
    });
  }

  addEventListener = (event: string, listener: Function) => {
    // listener()
  }

  // sendEvent = (data: Buffer | string | number | Object) => {
    
  // };

  _handlePong = () => {

  };

  _isReservedOpcode = (OPCODE: number) => {
    return !Object.values(Opcode).includes(OPCODE);
  };

  _isControlFrame = (frameData: FrameData) => {
    return [
      Opcode.CLOSE,
      Opcode.PING,
      Opcode.PONG,
    ].includes(frameData.OPCODE);
  };

  sendPing = (socket: Duplex, frameData: FrameData) => {
    this._sendData(socket, {
      payload: frameData.payload,
      OPCODE: Opcode.PING,
    });
  };


  sendPong = (socket: Duplex, frameData: FrameData) => {
    this._sendData(socket, {
      payload: frameData.payload,
      OPCODE: Opcode.PONG,
    });
  };


  _handleControlFrame = (socket: Duplex, frameData: FrameData) => {
    if (frameData.payloadLength >= 126) {
      this.handleError(`Invalid control frame: payload length must be less than 126, but was ${frameData.payloadLength}`);
    }
    if (frameData.FIN === 0) {
      this.handleError(`Invalid control frame: control frames must not be fragmented`);
    }
    if (frameData.OPCODE === Opcode.CLOSE) {
      this.handleClose(frameData.payload);
    } else if (frameData.OPCODE === Opcode.PING) {
      this.sendPong(socket, frameData);
    } else if (frameData.OPCODE === Opcode.PONG) {
      this._handlePong();
    }
  };


  _handleFrame = (socket: Duplex, frameData: FrameData, accumulatedData: AccumulatedData) => {
    /////////////////////////////////////////////////////////////////////
    //                          Fragmentation                          //
    //                                                                 //
    //           FIN    =  0     FIN    = 0       FIN    = 1           //
    //                       -->>            -->>                      //
    //           OPCODE != 0     OPCODE = 0       OPCODE = 0           //
    /////////////////////////////////////////////////////////////////////
    if (this._isReservedOpcode(frameData.OPCODE)) {
      this.handleError('A reserved OPCODE was used. Dropping the connection');
    }
    if (this._isControlFrame(frameData)) {
      this._handleControlFrame(socket, frameData);
    } else if (frameData.FIN === 1) {
      if (frameData.OPCODE === Opcode.CONTINUATION && !accumulatedData.type) {
        return this.handleError('Invalid fragmentation termination attempt: there is no pending fragmantation')
      }
      if (frameData.OPCODE === Opcode.CONTINUATION) {
        const { type, payload } = accumulatedData;
        const finalPayload = decodePayload(
          Buffer.concat([payload, frameData.payload]),
          type,
        );
        
        delete accumulatedData.type;
        delete accumulatedData.payload;
        return this.handleData(finalPayload);
      }  else {
        const decodedPayload = decodePayload(frameData.payload, frameData.OPCODE);
        return this.handleData(decodedPayload);
      }
    } else if (frameData.FIN === 0) {
      if (frameData.OPCODE === Opcode.CONTINUATION) {
        if (![Opcode.TEXT, Opcode.BINARY].includes(accumulatedData.type)) {
          this.handleError('Invalid flagmentation continuation attempt, there is no pending fragmantation');
        } else {
          accumulatedData.payload = Buffer.concat([accumulatedData.payload, frameData.payload]);
        }
      } else {
        const decodedPayload = decodePayload(frameData.payload, frameData.OPCODE);
        return this.handleData(decodedPayload);
      }
    }  
  };


  _parseFrame = (buff: Buffer) => {
    const FIN =                  (buff[0] & 0x80) >> 7;
    const RSV1 =                 (buff[0] & 0x40) >> 6;
    const RSV2 =                 (buff[0] & 0x20) >> 5;
    const RSV3 =                 (buff[0] & 0x10) >> 4;
    const OPCODE =               (buff[0] & 0x0F);
    const MASK =                 (buff[1] & 0x80) >> 7;
    const PAYLOAD_LENGTH_7 =     (buff[1] & 0x7F);

    let payloadLength = 0;

    let offset = 0;
    if (PAYLOAD_LENGTH_7 < 126) {
      offset = 2;
      payloadLength = PAYLOAD_LENGTH_7;
    } else if (PAYLOAD_LENGTH_7 === 126) {
      offset = 4;
      // reading 16 bits (concatenated octets 2 and 3)
      const PAYLOAD_LENGTH_16 = buff.readUInt16BE(2); // (b2 << 8) + b3,
      payloadLength = PAYLOAD_LENGTH_16;
    } else if (PAYLOAD_LENGTH_7 === 127) {
      offset = 10;
      // reading 64 bits (concatenated octets from interval [2, 9] both inclusive)
      const PAYLOAD_LENGTH_64 = buff.readUInt32BE(2) * Math.pow(2, 32) + buff.readUInt32BE(6); // (b2 << 56) + (b3 << 48) + (b4 << 40) + (b5 << 32) + (b6 << 24) + (b7 << 16) + (b8 << 8) + (b9 << 0),
      payloadLength = PAYLOAD_LENGTH_64;
    }

    // read 32 bits-length mask as buffer-of-length-4
    let maskKey = Buffer.alloc(0);
    if (MASK) {
      maskKey = buff.slice(offset, offset + 4);
      offset += 4;
    }
    
    const payloadChunk = buff.slice(offset);
    let payload = unmask(payloadChunk, maskKey);

    // if (OPCODE === constants.OPCODES.TEXT) {
    //   payload = unmaskededPayloadChunk.toString('utf-8');
    // } else {
    //   payload = unmaskededPayloadChunk;
    // }

    return {
      FIN,
      RSV1,
      RSV2,
      RSV3,
      OPCODE,
      MASK,
      payload,
      payloadLength,
    }
  };


  _sendData = (socket: Duplex, options: DataOptions) => {
    const controlBytes = [
      (options.FIN    || 0x80) | // FIN
      (options.RSV1   || 0x00) | // RSV1
      (options.RSV2   || 0x00) | // RSV2
      (options.RSV3   || 0x00) | // RSV3
      (options.OPCODE || 0x02),  // OPCODE
    ];

    const { payload } = options;
    let payloadLength = 0;
    let extendedPayoadLengthBytes = Buffer.alloc(0);
    if (payload.length <= 126) {
      payloadLength = payload.length;
    } else if (payload.length < 65536) {
      payloadLength = 126;
      extendedPayoadLengthBytes = Buffer.alloc(4);
      extendedPayoadLengthBytes.writeUInt16BE(payload.length);
    } else {
      payloadLength = 127;
      extendedPayoadLengthBytes = Buffer.alloc(8)
      extendedPayoadLengthBytes.writeBigUInt64BE(BigInt(payload.length));
    }
    controlBytes.push((+options.mask << 7) | payloadLength);

    const payloadBuffer = Buffer.from(payload);
    let payLoadData = payloadBuffer;
    let maskKey = Buffer.alloc(0);
    if (options.mask) {
      maskKey = options.maskKey || generateMaskKey();
      payLoadData = unmask(payloadBuffer, maskKey);
    }
    
    const data = Buffer.concat([
      Buffer.from(controlBytes),
      extendedPayoadLengthBytes,
      maskKey,
      payLoadData
    ]);
    socket.write(data);
  };

};

// module.exports = Socketter;
export default Socketter;