import { randomFillSync, createHash } from 'crypto';
import { MAGIC_STRING, Opcode } from './constants';

export const getWebSocketAccept = (key: string) => createHash('sha1').update(key + MAGIC_STRING).digest('base64');

export const unmask = (payload: Buffer, maskKey: Buffer) =>
  Buffer.from(payload.map((byte, i) => {
    const j = i % 4;
    return byte ^ maskKey[j];
  }));

export const generateMaskKey = () => randomFillSync(Buffer.alloc(4), 0, 4);

export const mask = (payload: Buffer, maskKey: Buffer) => unmask(payload, maskKey);

export const decodePayload = (payload: Buffer, type = Opcode.TEXT) => {
  if (type === Opcode.TEXT) {
    return payload.toString('utf-8');
  };
  return payload;
}
export const isValidUTF8 = (buf: Buffer) => {
  const len = buf.length;
  let i = 0;

  while (i < len) {
    if ((buf[i] & 0x80) === 0) {
      // 0xxxxxxx
      i++;
    } else if ((buf[i] & 0xe0) === 0xc0) {
      // 110xxxxx 10xxxxxx
      if (
        i + 1 === len ||
        (buf[i + 1] & 0xc0) !== 0x80 ||
        (buf[i] & 0xfe) === 0xc0 // Overlong
      ) {
        return false;
      }

      i += 2;
    } else if ((buf[i] & 0xf0) === 0xe0) {
      // 1110xxxx 10xxxxxx 10xxxxxx
      if (
        i + 2 >= len ||
        (buf[i + 1] & 0xc0) !== 0x80 ||
        (buf[i + 2] & 0xc0) !== 0x80 ||
        (buf[i] === 0xe0 && (buf[i + 1] & 0xe0) === 0x80) || // Overlong
        (buf[i] === 0xed && (buf[i + 1] & 0xe0) === 0xa0) // Surrogate (U+D800 - U+DFFF)
      ) {
        return false;
      }

      i += 3;
    } else if ((buf[i] & 0xf8) === 0xf0) {
      // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
      if (
        i + 3 >= len ||
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
    } else {
      return false;
    }
  }

  return true;
}
export const toBin = (buf: Buffer) => 
  buf.reduce((acc, byte) => {
    const parsed = parseInt(byte.toString(), 10).toString(2);
    const bin = '0'.repeat(8 - parsed.length) + parsed;
    return acc + bin;
  }, '');

// module.exports = {
//   getWebSocketAccept,
//   unmask,
//   mask,
//   generateMaskKey,
//   decodePayload,
//   isValidUTF8,
// };
