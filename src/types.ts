export type SubType = "mint" | "melt";

export type Listeners = {
  update: (...args: any[]) => void;
  error: (type: string, id: string, e: Error) => void;
};

export type SocketOptions = {
  url: string;
  maxRetries?: number;
  backoffFactor?: number;
  maxBackoffTime?: number;
  connectionTimeout?: number;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onReconnectFailed?: () => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (event: Event) => void;
};

type RpcSubKinds = "bolt11_mint_quote" | "bolt11_melt_quote" | "proof_state";

export type RpcSubId = string | number | null;

type JsonRpcParams = any;

export type JsonRpcReqParams = {
  kind: RpcSubKinds;
  filters: Array<string>;
  subId: string;
};

type JsonRpcSuccess<T = any> = {
  jsonrpc: "2.0";
  result: T;
  id: RpcSubId;
};

export type JsonRpcErrorObject = {
  code: number;
  message: string;
  data?: any;
};

type JsonRpcError = {
  jsonrpc: "2.0";
  error: JsonRpcErrorObject;
  id: RpcSubId;
};

type JsonRpcRequest = {
  jsonrpc: "2.0";
  method: "sub";
  params: JsonRpcReqParams;
  id: Exclude<RpcSubId, null>;
};

export type JsonRpcNotification = {
  jsonrpc: "2.0";
  method: string;
  params?: JsonRpcParams;
};

export type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcNotification
  | JsonRpcSuccess
  | JsonRpcError;
