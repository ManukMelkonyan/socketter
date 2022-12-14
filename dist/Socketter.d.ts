/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { Server } from 'http';
import { Socket } from 'net';
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
declare class SimpleSocket {
    _httpSocket: Socket;
    _eventListeners: Record<'close' | 'data' | 'ping', ((data?: Buffer | string) => any)[]>;
    _accumulatedData: AccumulatedData;
    constructor(_httpSocket: Socket);
    addEventListener: (event: 'close' | 'data' | 'ping', listener: (data?: Buffer | string) => any) => void;
    removeEventListener: (event: 'close' | 'data' | 'ping', listener: (data?: Buffer | string) => any) => boolean;
    sendMessage: (data: Buffer | string) => void;
    _sendData: (options: DataOptions) => void;
    _handleData: (data?: Buffer | string) => void;
    _handleClose: (data?: Buffer | string) => void;
    _handleError: (error: Error | string) => void;
    _handlePong: () => void;
    _handleFrame: (frameData: FrameData) => void;
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
    _isReservedOpcode: (OPCODE: number) => boolean;
    _isControlFrame: (frameData: FrameData) => boolean;
    sendPing: (socket: Socket, frameData: FrameData) => void;
    _sendPong: (frameData: FrameData) => void;
    _handleControlFrame: (frameData: FrameData) => void;
}
export declare class Socketter {
    _server: Server;
    constructor(server: Server, onConnect: (simpleSocket: SimpleSocket) => any);
}
export default Socketter;
