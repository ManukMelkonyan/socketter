const { OPCODES } = require('./constants');
const { unmask, generateMaskKey, getWebSocketAccept } = require('./helpers');
const fs = require('fs');
const constants = require('./constants');
const { type } = require('os');


const decodePayload = (payload, type = 'TEXT') => {
  if (type === 'TEXT') {
    return payload.toString('utf-8');
  };
  return payload;
}

const isReservedOpcode = (OPCODE) => !Object.values(OPCODES).includes(OPCODE);

const isControlFrame = (frameData) => [
  OPCODES.CLOSE,
  OPCODES.PING,
  OPCODES.PONG,
].includes(frameData.OPCODE);

const sendPing = (socket, frameData) => {
  sendData(socket, {
    payload: frameData.payload,
    OPCODE: OPCODES.PING,
  });
};


const sendPong = (socket, frameData) => {

};


const handleControlFrame = (socket, frameData) => {
  if (frameData.payloadLength >= 126) {
    socket.handleError(`Invalid payload length of control frame: ${frameData.payloadLength}`);
  }
  if (frameData.OPCODE === OPCODES.CLOSE) {
    socket.handleClose(frameData.payload);
  } else if (frameData.OPCODE === OPCODES.PING) {
    sendPong(socket, frameData);
  } 
};


const processFrame = (socket, frameData, accumulatedData = {} /* for fragmentation */ ) => {
  /////////////////////////////////////////////////////////////////////
  //                          Fragmentation                          //
  //                                                                 //
  //           FIN    =  0     FIN    = 0       FIN    = 1           //
  //                       -->>            -->>                      //
  //           OPCODE != 0     OPCODE = 0       OPCODE = 0           //
  /////////////////////////////////////////////////////////////////////
  if (isReservedOpcode(frameData.OPCODE)) {
    socket.handleError('A reserved OPCODE was used. Dropping the connection');
  }
  if (isControlFrame(frameData)) {
    handleControlFrame(socket, frameData);
  } else if (frameData.FIN === 1) {
    if (frameData.OPCODE === OPCODES.CONTINUATION) {
      const { type, payload } = accumulatedData;
      const finalPayload = decodePayload(
        Buffer.concat([payload, frameData.payload]),
        type,
      );

      return socket.handleData(finalPayload);
    }
  } else if (frameData.FIN === 0) {
    if (frameData.OPCODE === OPCODES.CONTINUATION) {
      if (!['TEXT', 'BINARY'].includes(accumulatedData.type)) {
        socket.handleError('Invalid continuation attempt, there is no pending fragmantation');
      } else {
        accumulatedData.payload = Buffer.concat([accumulatedData.payload, frameData.payload]);
      }
    } else if (frameData.OPCODE === OPCODES.TEXT) {
      accumulatedData.type = 'TEXT';
      accumulatedData.payload = frameData.payload;
    } else if (frameData.OPCODE === OPCODES.BINARY) {
      accumulatedData.type = 'BINARY';
      accumulatedData.payload = frameData.payload;
    }
  }
  
};


const parseFrame = (buff) => {
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
    const PAYLOAD_LENGTH_16 = buff.readUInt16BE(2); // (b2 << 8) + b3,
    payloadLength = PAYLOAD_LENGTH_16;
  } else if (PAYLOAD_LENGTH_7 === 127) {
    offset = 10;
    const PAYLOAD_LENGTH_64 = buff.readUInt32BE(2) * Math.pow(2, 32) + buff.readUInt32BE(6); // (b2 << 56) + (b3 << 48) + (b4 << 40) + (b5 << 32) + (b6 << 24) + (b7 << 16) + (b8 << 8) + (b9 << 0),
    payloadLength = PAYLOAD_LENGTH_64;
  }

  // read 32 bits-length mask as buffer-of-length-4
  let maskKey = [];
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
}

const handleUpgrade = (req, socket) => {
  console.log(req.headers);
  const webSocketKey = req.headers['sec-websocket-key'];
  const webSocketAccept = getWebSocketAccept(webSocketKey);
  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${webSocketAccept}`
  ];
  socket.write(headers.concat('\r\n').join('\r\n'));

  socket.on('close', () => {
    console.log('='.repeat(111));
    console.log('='.repeat(111));
    console.log('closed');
    console.log('='.repeat(111));
    console.log('='.repeat(111));
  });

  setTimeout(() => sendPing(socket, { payload: Buffer.from('hello') }), 1000);
  let accumulatedData = null;  
  socket.on('data', (chunk) => {
    const frameData = parseFrame(chunk, accumulatedData);
    // processFrame(frameData, accumulatedData);
    
    console.log(frameData);
    // fs.writeFileSync('message.jpeg', frameData.payload);
    // socket.end();
  })
}

const sendData = (socket, options) => {
  const controlBytes = [
    (options.FIN    || 0x80) | // FIN
    (options.RSV1   || 0x00) | // RSV1
    (options.RSV2   || 0x00) | // RSV2
    (options.RSV3   || 0x00) | // RSV3
    (options.OPCODE || 0x02), // OPCODE
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
    extendedPayoadLengthBytes.writeUInt64BE(payload.length);
  }
  controlBytes.push((options.mask << 7) | payloadLength);

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
  console.log(data);
  socket.write(data);
};

module.exports = {
  handleUpgrade,
};