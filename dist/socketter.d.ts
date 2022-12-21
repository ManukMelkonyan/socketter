import { Server } from 'http';
import { SocketterOptions } from './types';
import SimpleSocket from './SimpleSocket';
declare const socketter: (server: Server, onConnect: (simpleSocket: SimpleSocket) => any, options: SocketterOptions) => void;
export default socketter;
