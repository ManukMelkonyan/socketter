"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const helpers_1 = require("./helpers");
// type StatusCode = 1000 | 1001 | 1002 | 1003 | 1004 | 1005 | 1006 | 1007 | 1008 | 1009 | 1010 | 1011 | 1012 | 1013 | 1014 | 1015;
class SimpleSocket {
    constructor(_httpSocket, options = {}) {
        this._pingTimeout = null;
        this.stopAutoPing = () => {
            this._autoPing = false;
        };
        this.addEventListener = (event, listener) => {
            this._eventListeners[event].push(listener);
        };
        this.removeEventListener = (event, listener) => {
            const listenerIndex = this._eventListeners[event].findIndex(cb => cb === listener);
            if (listenerIndex === -1)
                return false;
            this._eventListeners[event].splice(listenerIndex, 1);
            return true;
        };
        this.sendPing = (data = Buffer.alloc(0)) => {
            this._pingPayload = data;
            this._sendData({
                FIN: 0x80,
                OPCODE: constants_1.Opcode.PING,
                payload: Buffer.from(data),
            });
            this._pingTimeout = setTimeout(() => {
                clearTimeout(this._pingTimeout);
                this.close(1002); // protocol error, no pong to answer the latest ping within the give timeout
            }, this._pingTimeoutMs);
        };
        this.sendMessage = (data) => {
            const opcode = Buffer.isBuffer(data) ? constants_1.Opcode.BINARY : constants_1.Opcode.TEXT;
            this._sendData({
                FIN: 0x80,
                RSV1: 0,
                RSV2: 0,
                RSV3: 0,
                OPCODE: opcode,
                payload: Buffer.from(data)
            });
        };
        this.close = (statusCode = 1001) => {
            clearTimeout(this._pingTimeout);
            const payload = Buffer.alloc(2);
            payload.writeUint16BE(statusCode, 0);
            if (!['closed', 'readOnly'].includes(this._httpSocket.readyState)) {
                this._sendData({
                    FIN: 0x80,
                    RSV1: 0,
                    RSV2: 0,
                    RSV3: 0,
                    OPCODE: 0x8,
                    payload,
                });
                this._httpSocket.end();
            }
        };
        this._sendData = (options) => {
            const controlBytes = [
                (options.FIN || 0x80) |
                    (options.RSV1 || 0x00) |
                    (options.RSV2 || 0x00) |
                    (options.RSV3 || 0x00) |
                    (options.OPCODE || 0x02),
            ];
            const { payload } = options;
            let payloadLength = 0;
            let extendedPayoadLengthBytes = Buffer.alloc(0);
            if (payload.length <= 125) {
                payloadLength = payload.length;
            }
            else if (payload.length < 65536) {
                payloadLength = 126;
                extendedPayoadLengthBytes = Buffer.alloc(2);
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
            this._eventListeners.data.forEach(cb => cb(data));
        };
        this.handleClose = (statusCode) => {
            this.close(statusCode);
            this._eventListeners.close.forEach(cb => cb(statusCode));
        };
        this._handleClose = (frameData) => {
            let statusCode = 1000;
            if (frameData.payloadLength === 0) {
                statusCode = 1000; // no status code was provided, normal closure
            }
            else if (frameData.payloadLength < 2) {
                statusCode = 1002; // provided payload has length < 2, protocol error
            }
            else {
                statusCode = frameData.payload.readInt16BE(0);
            }
            this.handleClose(statusCode);
        };
        this._handlePong = (payload) => {
            if (!this._pingPayload)
                return;
            if (Buffer.compare(payload, this._pingPayload) !== 0) {
                return this.close(1002); // protocol error, because the pong's payload is not equal to the last ping's payload
            }
            clearTimeout(this._pingTimeout);
            if (this._autoPing) {
                this._pingTimeout = setTimeout(() => {
                    this.sendPing(this._pingPayload);
                }, this._pingInterval);
            }
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
                this.close(1002); // A reserved OPCODE was used. Dropping the connection
            }
            if (this._isControlFrame(frameData)) {
                this._handleControlFrame(frameData);
            }
            else if (frameData.FIN === 1) {
                if (frameData.OPCODE === constants_1.Opcode.CONTINUATION && !this._accumulatedData.type) {
                    return this.close(1002); // Invalid fragmentation termination attempt: there is no pending fragmantation
                }
                if (frameData.OPCODE === constants_1.Opcode.CONTINUATION) {
                    const { type, payload } = this._accumulatedData;
                    const { error, payload: finalPayload } = (0, helpers_1.decodePayload)(Buffer.concat([payload, frameData.payload]), type);
                    if (error)
                        return this.close(1007);
                    delete this._accumulatedData.type;
                    delete this._accumulatedData.payload;
                    return this._handleData(finalPayload);
                }
                else {
                    const { error, payload: decodedPayload } = (0, helpers_1.decodePayload)(frameData.payload, frameData.OPCODE);
                    if (error)
                        return this.close(1007);
                    return this._handleData(decodedPayload);
                }
            }
            else if (frameData.FIN === 0) {
                if (frameData.OPCODE === constants_1.Opcode.CONTINUATION) {
                    if (![constants_1.Opcode.TEXT, constants_1.Opcode.BINARY].includes(this._accumulatedData.type)) {
                        this.close(1002); // Invalid flagmentation continuation attempt, there is no pending fragmantation
                    }
                    else {
                        this._accumulatedData.payload = Buffer.concat([this._accumulatedData.payload, frameData.payload]);
                    }
                }
                else {
                    const { error, payload: decodedPayload } = (0, helpers_1.decodePayload)(frameData.payload, frameData.OPCODE);
                    if (error)
                        return this.close(1007);
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
        this._sendPong = (frameData) => {
            this._sendData({
                payload: frameData.payload,
                OPCODE: constants_1.Opcode.PONG,
            });
        };
        this._handleControlFrame = (frameData) => {
            if (frameData.payloadLength >= 126) {
                this.close(1002); // Invalid control frame: payload length must be less than 126
            }
            if (frameData.FIN === 0) {
                this.close(1002); // Invalid control frame: control frames must not be fragmented
            }
            if (frameData.OPCODE === constants_1.Opcode.CLOSE) {
                this._handleClose(frameData);
            }
            else if (frameData.OPCODE === constants_1.Opcode.PING) {
                this._sendPong(frameData);
            }
            else if (frameData.OPCODE === constants_1.Opcode.PONG) {
                this._handlePong(frameData.payload);
            }
        };
        this._httpSocket = _httpSocket;
        this._eventListeners = {
            'close': [],
            'data': [],
            'ping': [],
        };
        this._accumulatedData = {};
        this._autoPing = options.autoPing || false; // by default disabled
        this._pingTimeoutMs = options.pingTimeout || 10000; // by default 10 seconds
        this._pingInterval = options.pingInterval || 20000; // by default 20 seconds
        this._pingPayload = options.pingPayload || Buffer.alloc(0); // by default empty payload
        if (this._autoPing) {
            this.sendPing(this._pingPayload);
        }
    }
    ;
}
;
exports.default = SimpleSocket;
