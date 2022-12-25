"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Socketter = void 0;
const constants_1 = require("./constants");
const helpers_1 = require("./helpers");
class SimpleSocket {
    constructor(_httpSocket) {
        this.addEventListener = (event, listener) => {
            this._eventListeners[event].push(listener);
        };
        this.removeEventListener = (event, listener) => {
            const listenerIndex = this._eventListeners[event].findIndex((cb) => cb === listener);
            if (listenerIndex === -1)
                return false;
            this._eventListeners[event].splice(listenerIndex, 1);
            return true;
        };
        this.sendMessage = (data) => {
            const opcode = Buffer.isBuffer(data) ? constants_1.Opcode.BINARY : constants_1.Opcode.TEXT;
            this._sendData({
                FIN: 1,
                RSV1: 0,
                RSV2: 0,
                RSV3: 0,
                OPCODE: opcode,
                payload: Buffer.from(data)
            });
        };
        this._sendData = (options) => {
            const controlBytes = [
                (options.FIN || 0x80) | // FIN
                    (options.RSV1 || 0x00) | // RSV1
                    (options.RSV2 || 0x00) | // RSV2
                    (options.RSV3 || 0x00) | // RSV3
                    (options.OPCODE || 0x02), // OPCODE
            ];
            const { payload } = options;
            let payloadLength = 0;
            let extendedPayoadLengthBytes = Buffer.alloc(0);
            if (payload.length <= 126) {
                payloadLength = payload.length;
            }
            else if (payload.length < 65536) {
                payloadLength = 126;
                extendedPayoadLengthBytes = Buffer.alloc(4);
                extendedPayoadLengthBytes.writeUInt16BE(payload.length);
            }
            else {
                payloadLength = 127;
                extendedPayoadLengthBytes = Buffer.alloc(8);
                extendedPayoadLengthBytes.writeBigUInt64BE(BigInt(payload.length));
            }
            controlBytes.push((+options.mask << 7) | payloadLength);
            const payloadBuffer = Buffer.from(payload);
            let payLoadData = payloadBuffer;
            let maskKey = Buffer.alloc(0);
            if (options.mask) {
                maskKey = options.maskKey || (0, helpers_1.generateMaskKey)();
                payLoadData = (0, helpers_1.unmask)(payloadBuffer, maskKey);
            }
            const data = Buffer.concat([
                Buffer.from(controlBytes),
                extendedPayoadLengthBytes,
                maskKey,
                payLoadData
            ]);
            this._httpSocket.write(data);
        };
        this._handleData = (data) => {
            this._eventListeners.data.forEach(cb => {
                cb(data);
            });
        };
        this._handleClose = (data) => {
            this._eventListeners.close.forEach(cb => {
                cb(data);
            });
        };
        this._handleError = (error) => {
        };
        this._handlePong = () => {
        };
        this._handleFrame = (frameData) => {
            /////////////////////////////////////////////////////////////////////
            //                          Fragmentation                          //
            //                                                                 //
            //           FIN    =  0     FIN    = 0       FIN    = 1           //
            //                       -->>            -->>                      //
            //           OPCODE != 0     OPCODE = 0       OPCODE = 0           //
            /////////////////////////////////////////////////////////////////////
            if (this._isReservedOpcode(frameData.OPCODE)) {
                this._handleError('A reserved OPCODE was used. Dropping the connection');
            }
            if (this._isControlFrame(frameData)) {
                this._handleControlFrame(frameData);
            }
            else if (frameData.FIN === 1) {
                if (frameData.OPCODE === constants_1.Opcode.CONTINUATION && !this._accumulatedData.type) {
                    return this._handleError('Invalid fragmentation termination attempt: there is no pending fragmantation');
                }
                if (frameData.OPCODE === constants_1.Opcode.CONTINUATION) {
                    const { type, payload } = this._accumulatedData;
                    const finalPayload = (0, helpers_1.decodePayload)(Buffer.concat([payload, frameData.payload]), type);
                    delete this._accumulatedData.type;
                    delete this._accumulatedData.payload;
                    return this._handleData(finalPayload);
                }
                else {
                    const decodedPayload = (0, helpers_1.decodePayload)(frameData.payload, frameData.OPCODE);
                    return this._handleData(decodedPayload);
                }
            }
            else if (frameData.FIN === 0) {
                if (frameData.OPCODE === constants_1.Opcode.CONTINUATION) {
                    if (![constants_1.Opcode.TEXT, constants_1.Opcode.BINARY].includes(this._accumulatedData.type)) {
                        this._handleError('Invalid flagmentation continuation attempt, there is no pending fragmantation');
                    }
                    else {
                        this._accumulatedData.payload = Buffer.concat([this._accumulatedData.payload, frameData.payload]);
                    }
                }
                else {
                    const decodedPayload = (0, helpers_1.decodePayload)(frameData.payload, frameData.OPCODE);
                    return this._handleData(decodedPayload);
                }
            }
        };
        this._parseFrame = (buff) => {
            const FIN = (buff[0] & 0x80) >> 7;
            const RSV1 = (buff[0] & 0x40) >> 6;
            const RSV2 = (buff[0] & 0x20) >> 5;
            const RSV3 = (buff[0] & 0x10) >> 4;
            const OPCODE = (buff[0] & 0x0F);
            const MASK = (buff[1] & 0x80) >> 7;
            const PAYLOAD_LENGTH_7 = (buff[1] & 0x7F);
            let payloadLength = 0;
            let offset = 0;
            if (PAYLOAD_LENGTH_7 < 126) {
                offset = 2;
                payloadLength = PAYLOAD_LENGTH_7;
            }
            else if (PAYLOAD_LENGTH_7 === 126) {
                offset = 4;
                // reading 16 bits (concatenated octets 2 and 3)
                const PAYLOAD_LENGTH_16 = buff.readUInt16BE(2); // (b2 << 8) + b3,
                payloadLength = PAYLOAD_LENGTH_16;
            }
            else if (PAYLOAD_LENGTH_7 === 127) {
                offset = 10;
                // reading 64 bits (concatenated octets from interval [2, 9] both inclusive)
                const PAYLOAD_LENGTH_64 = buff.readUInt32BE(2) * Math.pow(2, 32) + buff.readUInt32BE(6); // (b2 << 56) + (b3 << 48) + (b4 << 40) + (b5 << 32) + (b6 << 24) + (b7 << 16) + (b8 << 8) + (b9 << 0),
                payloadLength = PAYLOAD_LENGTH_64;
            }
            // read 32 bits-length mask as buffer-of-length-4
            let maskKey = Buffer.alloc(0);
            if (MASK) {
                maskKey = buff.subarray(offset, offset + 4);
                offset += 4;
            }
            const payloadChunk = buff.subarray(offset);
            let payload = (0, helpers_1.unmask)(payloadChunk, maskKey);
            return {
                FIN,
                RSV1,
                RSV2,
                RSV3,
                OPCODE,
                MASK,
                payload,
                payloadLength,
            };
        };
        this._isReservedOpcode = (OPCODE) => {
            return !Object.values(constants_1.Opcode).includes(OPCODE);
        };
        this._isControlFrame = (frameData) => {
            return [
                constants_1.Opcode.CLOSE,
                constants_1.Opcode.PING,
                constants_1.Opcode.PONG,
            ].includes(frameData.OPCODE);
        };
        this.sendPing = (socket, frameData) => {
            this._sendData({
                payload: frameData.payload,
                OPCODE: constants_1.Opcode.PING,
            });
        };
        this._sendPong = (frameData) => {
            this._sendData({
                payload: frameData.payload,
                OPCODE: constants_1.Opcode.PONG,
            });
        };
        this._handleControlFrame = (frameData) => {
            if (frameData.payloadLength >= 126) {
                this._handleError(`Invalid control frame: payload length must be less than 126, but was ${frameData.payloadLength}`);
            }
            if (frameData.FIN === 0) {
                this._handleError(`Invalid control frame: control frames must not be fragmented`);
            }
            if (frameData.OPCODE === constants_1.Opcode.CLOSE) {
                this._handleClose(frameData.payload);
            }
            else if (frameData.OPCODE === constants_1.Opcode.PING) {
                this._sendPong(frameData);
            }
            else if (frameData.OPCODE === constants_1.Opcode.PONG) {
                this._handlePong();
            }
        };
        this._httpSocket = _httpSocket;
        this._eventListeners = {
            'close': [],
            'data': [],
            'ping': [],
        };
        this._accumulatedData = {};
    }
}
class Socketter {
    constructor(server, onConnect) {
        this._server = server;
        server.on('upgrade', (req, socket) => {
            const webSocketKey = req.headers['sec-websocket-key'];
            const webSocketAccept = (0, helpers_1.getWebSocketAccept)(webSocketKey);
            const headers = [
                'HTTP/1.1 101 Switching Protocols',
                'Upgrade: websocket',
                'Connection: Upgrade',
                `Sec-WebSocket-Accept: ${webSocketAccept}`,
            ];
            socket.write(headers.concat('\r\n').join('\r\n')); // Opening handshake
            const simpleSocket = new SimpleSocket(socket); // creating this instance for higher level of abstraction with easy-to-use API
            onConnect(simpleSocket);
            socket.on('close', () => {
                console.log('='.repeat(111));
                console.log('='.repeat(111));
                console.log('Connection closed');
                console.log('='.repeat(111));
                console.log('='.repeat(111));
            });
            // setTimeout(() => sendPing(socket, { payload: Buffer.from('hello') }), 2000);
            socket.on('data', (chunk) => {
                const frameData = simpleSocket._parseFrame(chunk);
                simpleSocket._handleFrame(frameData);
            });
        });
    }
}
exports.Socketter = Socketter;
;
// module.exports = Socketter;
exports.default = Socketter;
