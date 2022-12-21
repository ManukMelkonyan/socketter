import { Opcode } from "./constants";

export type DataOptions = {
  FIN?: number;
  RSV1?: number;
  RSV2?: number;
  RSV3?: number;
  OPCODE?: number;
  payload: Buffer;
  mask?: boolean;
  maskKey?: Buffer
};

export type FrameData = {
  FIN: number;
  RSV1: number;
  RSV2: number;
  RSV3: number;
  OPCODE: Opcode;
  payload: Buffer;
  payloadLength: number;
};

export type AccumulatedData = {
  payload?: Buffer;
  type?: Opcode;
};

export type SocketterOptions = {
  pingTimeout?: number,
  autoPing?: boolean,
  pingInterval?: number,
  pingPayload?: Buffer,
};
