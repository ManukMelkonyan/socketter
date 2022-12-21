/// <reference types="node" />
import { Opcode } from './constants';
export declare const getWebSocketAccept: (key: string) => string;
export declare const unmask: (payload: Buffer, maskKey: Buffer) => Buffer;
export declare const generateMaskKey: () => Buffer;
export declare const mask: (payload: Buffer, maskKey: Buffer) => Buffer;
export declare const decodePayload: (payload: Buffer, type: Opcode) => {
    error: string;
    payload: any;
} | {
    error: any;
    payload: string;
} | {
    error: any;
    payload: Buffer;
};
export declare const isValidUTF8: (buf: Buffer) => boolean;
export declare const toBin: (buf: Buffer) => string;
