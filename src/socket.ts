import { Queue } from "./queue";
import { SocketOptions } from "./types";

export class Socket {
  private url: string;
  private maxRetries: number;
  private backoffFactor: number;
  private maxBackoffTime: number;
  private connectionTimeout: number;
  private retryCount: number = 0;
  private reconnectTimeoutId?: number;
  private ws?: WebSocket;
  private sendQueue: Queue<string>;
  private sendInterval?: number;
  private isManualClose: boolean = false;

  constructor(private options: SocketOptions) {
    this.sendQueue = new Queue();
    this.url = options.url;
    this.maxRetries = options.maxRetries ?? 10;
    this.backoffFactor = options.backoffFactor ?? 2;
    this.maxBackoffTime = options.maxBackoffTime ?? 30000;
    this.connectionTimeout = options.connectionTimeout ?? 5000;
  }

  connect() {
    console.log("Socket connecting");
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.CONNECTING ||
        this.ws.readyState === WebSocket.OPEN)
    ) {
      return;
    }
    this.ws = new WebSocket(this.url);
    this.isManualClose = false;

    const timeout = setTimeout(() => {
      this.ws?.close();
    }, this.connectionTimeout);

    this.ws.onopen = (event) => {
      console.log("Socket open");
      if (this.retryCount > 0) {
        this.options?.onReconnect?.();
      }
      clearTimeout(timeout);
      this.retryCount = 0;
      this.options.onOpen?.(event);
    };

    this.ws.onclose = (event) => {
      console.log("Socket closed");
      clearTimeout(timeout);
      this.options.onClose?.(event);
      if (!this.isManualClose) this.reconnect();
    };

    this.ws.onmessage = (event) => {
      console.log("Received event: ", event);
      this.options.onMessage?.(event);
    };

    this.ws.onerror = (event) => {
      clearTimeout(timeout);
      this.options.onError?.(event);
      if (this.ws?.readyState !== WebSocket.CLOSED) {
        this.ws?.close();
      }
    };
  }

  private reconnect() {
    if (this.retryCount >= this.maxRetries) {
      this.options.onReconnectFailed?.();
      return;
    }

    const backoffTime = Math.min(
      this.backoffFactor ** this.retryCount * 1000,
      this.maxBackoffTime,
    );

    this.reconnectTimeoutId = setTimeout(() => {
      this.retryCount++;
      this.connect();
    }, backoffTime) as unknown as number;
  }

  disconnect() {
    this.isManualClose = true;
    this.retryCount = 0;
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = undefined;
    }
    this.ws?.close();
    this.ws = undefined;
  }

  private handleQueue() {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return;
    }
    if (!this.sendQueue.first) {
      clearInterval(this.sendInterval);
      this.sendInterval = undefined;
      return;
    }
    const msg = this.sendQueue.dequeue();
    if (msg) {
      this._send(msg);
    }
  }

  send(data: string) {
    this.sendQueue.enqueue(data);
    if (!this.sendInterval) {
      this.sendInterval = setInterval(() => {
        this.handleQueue();
      }, 50) as unknown as number;
    }
  }

  private _send(data: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      throw new Error("WebSocket not connected");
    }
  }
}
