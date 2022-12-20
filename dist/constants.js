"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Opcode = exports.MAGIC_STRING = void 0;
exports.MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
var Opcode;
(function (Opcode) {
    Opcode[Opcode["CONTINUATION"] = 0] = "CONTINUATION";
    Opcode[Opcode["TEXT"] = 1] = "TEXT";
    Opcode[Opcode["BINARY"] = 2] = "BINARY";
    Opcode[Opcode["CLOSE"] = 8] = "CLOSE";
    Opcode[Opcode["PING"] = 9] = "PING";
    Opcode[Opcode["PONG"] = 10] = "PONG";
})(Opcode = exports.Opcode || (exports.Opcode = {}));
;
