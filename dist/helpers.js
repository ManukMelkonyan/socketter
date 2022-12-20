"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBin = exports.isValidUTF8 = exports.decodePayload = exports.mask = exports.generateMaskKey = exports.unmask = exports.getWebSocketAccept = void 0;
const crypto_1 = require("crypto");
const constants_1 = require("./constants");
const getWebSocketAccept = (key) => (0, crypto_1.createHash)('sha1').update(key + constants_1.MAGIC_STRING).digest('base64');
exports.getWebSocketAccept = getWebSocketAccept;
const unmask = (payload, maskKey) => Buffer.from(payload.map((byte, i) => {
    const j = i % 4;
    return byte ^ maskKey[j];
}));
exports.unmask = unmask;
const generateMaskKey = () => (0, crypto_1.randomFillSync)(Buffer.alloc(4), 0, 4);
exports.generateMaskKey = generateMaskKey;
const mask = (payload, maskKey) => (0, exports.unmask)(payload, maskKey);
exports.mask = mask;
const decodePayload = (payload, type = constants_1.Opcode.TEXT) => {
    if (type === constants_1.Opcode.TEXT) {
        return payload.toString('utf-8');
    }
    ;
    return payload;
};
exports.decodePayload = decodePayload;
const isValidUTF8 = (buf) => {
    const len = buf.length;
    let i = 0;
    while (i < len) {
        if ((buf[i] & 0x80) === 0) {
            // 0xxxxxxx
            i++;
        }
        else if ((buf[i] & 0xe0) === 0xc0) {
            // 110xxxxx 10xxxxxx
            if (i + 1 === len ||
                (buf[i + 1] & 0xc0) !== 0x80 ||
                (buf[i] & 0xfe) === 0xc0 // Overlong
            ) {
                return false;
            }
            i += 2;
        }
        else if ((buf[i] & 0xf0) === 0xe0) {
            // 1110xxxx 10xxxxxx 10xxxxxx
            if (i + 2 >= len ||
                (buf[i + 1] & 0xc0) !== 0x80 ||
                (buf[i + 2] & 0xc0) !== 0x80 ||
                (buf[i] === 0xe0 && (buf[i + 1] & 0xe0) === 0x80) || // Overlong
                (buf[i] === 0xed && (buf[i + 1] & 0xe0) === 0xa0) // Surrogate (U+D800 - U+DFFF)
            ) {
                return false;
            }
            i += 3;
        }
        else if ((buf[i] & 0xf8) === 0xf0) {
            // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
            if (i + 3 >= len ||
                (buf[i + 1] & 0xc0) !== 0x80 ||
                (buf[i + 2] & 0xc0) !== 0x80 ||
                (buf[i + 3] & 0xc0) !== 0x80 ||
                (buf[i] === 0xf0 && (buf[i + 1] & 0xf0) === 0x80) || // Overlong
                (buf[i] === 0xf4 && buf[i + 1] > 0x8f) ||
                buf[i] > 0xf4 // > U+10FFFF
            ) {
                return false;
            }
            i += 4;
        }
        else {
            return false;
        }
    }
    return true;
};
exports.isValidUTF8 = isValidUTF8;
const toBin = (buf) => buf.reduce((acc, byte) => {
    const parsed = parseInt(byte.toString(), 10).toString(2);
    const bin = '0'.repeat(8 - parsed.length) + parsed;
    return acc + bin;
}, '');
exports.toBin = toBin;
// module.exports = {
//   getWebSocketAccept,
//   unmask,
//   mask,
//   generateMaskKey,
//   decodePayload,
//   isValidUTF8,
// };
