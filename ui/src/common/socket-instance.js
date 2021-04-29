import { io } from 'socket.io-client';

export default io(
  process.env.NODE_ENV === 'development'
    ? `${location.protocol}//${location.hostname}:${process.env.VUE_APP_SERVER_PORT}`
    : location.host,
  {
    autoConnect: false,
  }
);
