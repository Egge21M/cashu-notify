import { Queue } from "./queue";
import { Socket } from "./socket";
import { Subscription } from "./subscription";
import {
  JsonRpcErrorObject,
  JsonRpcMessage,
  JsonRpcNotification,
  JsonRpcReqParams,
  RpcSubId,
} from "./types";

export class RPCManager {
  public readonly url: URL;
  private ws: Socket;
  private rpcListeners: { [rpcSubId: string]: any } = {};
  private messageQueue: Queue<any>;
  private handlingInterval?: number;
  private rpcId = 0;
  private callbacks: { onUpdate: (msg: JsonRpcNotification) => void };

  constructor(url: string, callbacks: { onUpdate: any; onReconnect: any }) {
    this.url = new URL(url);
    this.messageQueue = new Queue();
    this.ws = new Socket({
      url,
      onMessage: this.onMessage,
      onReconnect: callbacks.onReconnect,
    });
    this.ws.connect();
    this.callbacks = { onUpdate: callbacks.onUpdate };
  }

  onMessage(e: MessageEvent) {
    this.messageQueue.enqueue(e.data);
    if (!this.handlingInterval) {
      this.handlingInterval = setInterval(
        this.handleNextMesage.bind(this),
        0,
      ) as unknown as number;
    }
  }

  sendRequest(method: "subscribe", params: JsonRpcReqParams): void;
  sendRequest(method: "unsubscribe", params: { subId: string }): void;
  sendRequest(
    method: "subscribe" | "unsubscribe",
    params: Partial<JsonRpcReqParams>,
  ) {
    const id = this.rpcId;
    this.rpcId++;
    const message = JSON.stringify({ jsonrpc: "2.0", method, params, id });
    this.ws.send(message);
  }

  closeSubscription(subId: string) {
    this.ws.send(JSON.stringify(["CLOSE", subId]));
  }

  private addRpcListener(
    callback: () => any,
    errorCallback: (e: JsonRpcErrorObject) => any,
    id: Exclude<RpcSubId, null>,
  ) {
    this.rpcListeners[id] = { callback, errorCallback };
  }

  private removeRpcListener(id: Exclude<RpcSubId, null>) {
    delete this.rpcListeners[id];
  }

  private handleNextMesage() {
    if (!this.messageQueue.first) {
      clearInterval(this.handlingInterval);
      this.handlingInterval = undefined;
      return;
    }
    const message = this.messageQueue.dequeue() as string;
    let parsed;
    try {
      parsed = JSON.parse(message) as JsonRpcMessage;
      if ("result" in parsed && parsed.id != undefined) {
        if (this.rpcListeners[parsed.id]) {
          this.rpcListeners[parsed.id].callback();
          this.removeRpcListener(parsed.id);
        }
      } else if ("error" in parsed && parsed.id != undefined) {
        if (this.rpcListeners[parsed.id]) {
          this.rpcListeners[parsed.id].errorCallback(parsed.error);
          this.removeRpcListener(parsed.id);
        }
      } else if ("method" in parsed) {
        if ("id" in parsed) {
          // Do nothing as mints should not send requests
        } else {
          this.callbacks.onUpdate(parsed);
        }
      }
    } catch (e) {
      console.error(e);
      return;
    }
  }

  createSubscription(
    params: Omit<JsonRpcReqParams, "subId">,
    subs: Subscription[],
    errorCallback: (e: Error) => any,
  ) {
    const subId = (Math.random() + 1).toString(36).substring(7);
    this.addRpcListener(
      () => {
        subs.forEach((s) => {
          s.setActive();
        });
      },
      (e: JsonRpcErrorObject) => {
        errorCallback(new Error(e.message));
      },
      this.rpcId,
    );
    this.sendRequest("subscribe", { ...params, subId });
    this.rpcId++;
    return subId;
  }

  cancelSubscription(subId: string, callback: (payload: any) => any) {
    this.rpcId++;
    this.sendRequest("unsubscribe", { subId });
  }

  close() {
    this.ws.disconnect();
  }
}
