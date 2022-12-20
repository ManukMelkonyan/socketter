export const MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export enum Opcode {
  CONTINUATION= 0x0,
  TEXT=         0x1,
  BINARY=       0x2,
  CLOSE=        0x8,
  PING=         0x9,
  PONG=         0xA,
};
