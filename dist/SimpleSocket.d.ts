/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { Socket } from 'net';
import { AccumulatedData, SocketterOptions, FrameData, DataOptions } from './types';
declare class SimpleSocket {
    _httpSocket: Socket;
    _eventListeners: Record<'close' | 'data' | 'ping', ((data?: Buffer | string | number) => any)[]>;
    _accumulatedData: AccumulatedData;
    _autoPing: boolean;
    _pingTimeoutMs: number;
    _pingInterval: number;
    _pingPayload: Buffer;
    _pingTimeout: NodeJS.Timeout;
    constructor(_httpSocket: Socket, options?: SocketterOptions);
    stopAutoPing: () => void;
    addEventListener: (event: 'close' | 'data' | 'ping', listener: (data?: Buffer | string) => any) => void;
    removeEventListener: (event: 'close' | 'data' | 'ping', listener: (data?: Buffer | string) => any) => boolean;
    sendPing: (data?: Buffer) => void;
    sendMessage: (data: Buffer | string) => void;
    close: (statusCode?: number) => void;
    _sendData: (options: DataOptions) => void;
    _handleData: (data?: Buffer | string) => void;
    _handleClose: (frameData: FrameData) => void;
    _handlePong: (payload: Buffer) => void;
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
    _sendPong: (frameData: FrameData) => void;
    _handleControlFrame: (frameData: FrameData) => void;
}
export default SimpleSocket;
