"use client";

import { io, type Socket } from 'socket.io-client';
import { API_ORIGIN } from './api/client';

let socket: Socket | null = null;

/**
 * One authenticated Socket.IO connection per tab. The server authenticates
 * from the httpOnly access-token cookie, so nothing secret lives in JS.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_ORIGIN, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionDelayMax: 10000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
