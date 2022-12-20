/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { Server } from 'http';
import { Duplex } from 'stream';
import { Opcode } from './constants';
type DataOptions = {
    FIN?: number;
    RSV1?: number;
    RSV2?: number;
    RSV3?: number;
    OPCODE?: number;
    payload: Buffer;
    mask?: boolean;
    maskKey?: Buffer;
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
};
export declare class Socketter {
    _server: Server;
    eventListeners: Record<'open' | 'close' | 'data' | 'ping', ((socket: Duplex, data?: Buffer | string) => any)[]>;
    constructor(server: Server);
    addEventListener: (event: 'open' | 'close' | 'data' | 'ping', listener: (socket: Duplex, data?: Buffer | string) => any) => void;
    removeEventListener: (event: 'open' | 'close' | 'data' | 'ping', listener: (socket: Duplex, data?: Buffer | string) => any) => boolean;
    _handleData: (socket: Duplex, data?: Buffer | string) => void;
    _handleClose: (socket: Duplex, data?: Buffer | string) => void;
    _handleError: (socket: Duplex, error: Error | string) => void;
    _handlePong: () => void;
    _isReservedOpcode: (OPCODE: number) => boolean;
    _isControlFrame: (frameData: FrameData) => boolean;
    sendPing: (socket: Duplex, frameData: FrameData) => void;
    _sendPong: (socket: Duplex, frameData: FrameData) => void;
    _handleControlFrame: (socket: Duplex, frameData: FrameData) => void;
    _handleFrame: (socket: Duplex, frameData: FrameData, accumulatedData: AccumulatedData) => void;
    _parseFrame: (buff: Buffer) => {
        FIN: number;
        RSV1: number;
        RSV2: number;
        RSV3: number;
        OPCODE: number;
        MASK: number;
        payload: Buffer;
        payloadLength: number;
    };
    _sendData: (socket: Duplex, options: DataOptions) => void;
}
export default Socketter;
