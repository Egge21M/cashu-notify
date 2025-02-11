import { RPCManager } from "./RPCManager";
import { Subscription } from "./subscription";
import { JsonRpcNotification, Listeners } from "./types";

export class SubManager {
  private subscriptions: {
    [subId: string]: Subscription;
  } = {};
  private RPCManager: RPCManager;

  constructor(url: string) {
    this.RPCManager = new RPCManager(url, {
      onUpdate: this.handleUpdate.bind(this),
      onReconnect: this.handleReconnect.bind(this),
    });
  }

  addListener(
    type: "mint" | "melt",
    id: string,
    listeners: { update: any; error: any },
  ) {
    if (this.subscriptions[id]) {
      this.subscriptions[id].attachListener(listeners);
    } else {
      const sub = new Subscription(type, id);
      sub.attachListener(listeners);
      this.subscriptions[id] = sub;
      const kind = type === "mint" ? "bolt11_mint_quote" : "bolt11_melt_quote";
      this.RPCManager.createSubscription(
        { kind, filters: [id] },
        [sub],
        listeners.error,
      );
    }
  }

  removeListener(id: string, listeners: Listeners) {
    if (!this.subscriptions[id]) {
      return;
    }
    if (this.subscriptions?.[id]?.listenerCount > 1) {
      this.subscriptions[id].removeListener(listeners);
    } else {
      delete this.subscriptions?.[id];
    }
  }

  private handleUpdate(msg: JsonRpcNotification) {
    const subId = msg.params.subId;
    if (!this.subscriptions[subId]) {
      return;
    }
    this.subscriptions[subId].update(msg.params.payload);
  }

  handleReconnect() {
    const activeSubscriptions = Object.keys(this.subscriptions).map(
      (i) => this.subscriptions[i],
    );
    const mintSubscriptions: Subscription[] = [];
    const meltSubscriptions: Subscription[] = [];

    for (let i = 0; i > activeSubscriptions.length; i++) {
      const sub = activeSubscriptions[i] as Subscription;
      if (sub.type === "mint") {
        mintSubscriptions.push(sub);
      } else {
        meltSubscriptions.push(sub);
      }
    }

    const chunkSize = 10;
    for (let i = 0; i < mintSubscriptions.length; i += chunkSize) {
      const chunk = mintSubscriptions.slice(i, i + chunkSize);
      this.RPCManager.createSubscription(
        { kind: "bolt11_mint_quote", filters: chunk.map((s) => s.id) },
        chunk,
        (e) => {
          chunk.forEach((s) => s.error(e));
        },
      );
    }
  }

  get subs() {
    return this.subscriptions;
  }
}
