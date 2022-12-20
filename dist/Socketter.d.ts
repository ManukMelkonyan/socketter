/// <reference types="node" />
/// <reference types="node" />
import { Server, IncomingMessage } from 'http';
import { Duplex } from 'stream';
type DataHandler = {
    (data: Buffer | string): any;
};
type ErrorHandler = {
    (data: Error | string): any;
};
type DataOptions = {
    FIN?: number;
    RSV1?: number;
    RSV2?: number;
    RSV3?: number;
    OPCODE?: number;
    payload: Buffer;
    mask?: boolean;
};
type FrameData = {
    FIN: number;
    RSV1: number;
    RSV2: number;
    RSV3: number;
    OPCODE: number;
    payload: Buffer;
    payloadLength: number;
};
export declare class Socketter {
    _server: Server;
    handleData: DataHandler;
    handleClose: DataHandler;
    handleError: ErrorHandler;
    constructor(server: Server);
    _handlePong: () => void;
    _isReservedOpcode: (OPCODE: number) => boolean;
    _isControlFrame: (frameData: FrameData) => boolean;
    sendPing: (socket: Duplex, frameData: FrameData) => void;
    sendPong: (socket: Duplex, frameData: FrameData) => void;
    _handleControlFrame: (socket: Duplex, frameData: FrameData) => void;
    _handleFrame: (socket: Duplex, frameData: FrameData, accumulatedData: any) => any;
    _parseFrame: (buff: any) => {
        FIN: number;
        RSV1: number;
        RSV2: number;
        RSV3: number;
        OPCODE: number;
        MASK: number;
        payload: Buffer;
        payloadLength: number;
    };
    _handleUpgrade: (req: IncomingMessage, socket: Duplex) => void;
    _sendData: (socket: Duplex, options: DataOptions) => void;
}
export default Socketter;
