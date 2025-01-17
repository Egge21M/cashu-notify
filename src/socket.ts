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
  private isManualClose: boolean = false;

  constructor(private options: SocketOptions) {
    this.url = options.url;
    this.maxRetries = options.maxRetries ?? 10;
    this.backoffFactor = options.backoffFactor ?? 2;
    this.maxBackoffTime = options.maxBackoffTime ?? 30000;
    this.connectionTimeout = options.connectionTimeout ?? 5000;
  }

  public connect(): void {
    if (this.ws) {
      throw new Error("WebSocket already connected");
    }

    this.ws = new WebSocket(this.url);
    this.isManualClose = false;

    const timeout = setTimeout(() => {
      this.ws?.close();
    }, this.connectionTimeout);

    this.ws.onopen = (event) => {
      clearTimeout(timeout);
      this.retryCount = 0;
      this.options.onOpen?.(event);
    };

    this.ws.onclose = (event) => {
      clearTimeout(timeout);
      this.options.onClose?.(event);
      if (!this.isManualClose) this.reconnect();
    };

    this.ws.onmessage = (event) => {
      this.options.onMessage?.(event);
    };

    this.ws.onerror = (event) => {
      clearTimeout(timeout);
      this.options.onError?.(event);
      this.ws?.close();
    };
  }

  private reconnect(): void {
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

  public disconnect(): void {
    this.isManualClose = true;
    this.retryCount = 0;
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = undefined;
    }
    this.ws?.close();
    this.ws = undefined;
  }

  public send(data: string | ArrayBuffer | Blob): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      throw new Error("WebSocket not connected");
    }
  }
}
