import { Poller } from "./poller";
import { RPCManager } from "./RPCManager";
import { Subscription } from "./subscription";
import { Listeners, SubType } from "./types";

export class SubManager {
  private subscriptions: {
    [type in "mint" | "melt"]: {
      [subId: string]: Subscription;
    };
  } = { mint: {}, melt: {} };
  private poller?: Poller;
  private isFallbackActive: boolean = false;
  private debounceTimer?: number;
  private RPCManager: RPCManager;

  constructor(url: string) {
    this.RPCManager = new RPCManager(url);
  }

  addListener(
    type: "mint" | "melt",
    id: string,
    listeners: { update: any; error: any },
  ) {
    clearTimeout(this.debounceTimer);
    if (this.subscriptions[type][id]) {
      this.subscriptions[type][id].attachListener(listeners);
    } else {
      const sub = new Subscription(type, id);
      sub.attachListener(listeners);
      this.subscriptions[type][id] = sub;
    }
    this.debounceTimer = setTimeout(() => {
      this.handlePendingSubscriptions();
    }, 350) as unknown as number;
  }

  removeListener(type: SubType, id: string, listeners: Listeners) {
    if (this.subscriptions[type]?.[id]?.listenerCount > 1) {
      this.subscriptions[type][id].removeListener(listeners);
    } else {
      delete this.subscriptions[type]?.[id];
    }
  }

  private handlePendingSubscriptions() {
    const pendingSubs = this.pendingSubscriptions;
    for (let i = 0; i < pendingSubs.mint.length; i++) {
      pendingSubs.mint[i]?.setOpening();
    }
    for (let i = 0; i < pendingSubs.melt.length; i++) {
      pendingSubs.melt[i]?.setOpening();
    }
    if (pendingSubs.mint.length > 0) {
      this.RPCManager.createSubscription(
        {
          kind: "bolt11_mint_quote",
          filters: pendingSubs.mint.map((s) => s.id),
        },
        this.handleUpdate,
        this.handleError,
      );
    }
    if (pendingSubs.melt.length > 0) {
      this.RPCManager.createSubscription(
        {
          kind: "bolt11_melt_quote",
          filters: pendingSubs.mint.map((s) => s.id),
        },
        this.handleUpdate,
        this.handleError,
      );
    }
  }

  private handleUpdate() {}

  private handleError() {}

  private get pendingSubscriptions() {
    const pendingMintSubs: Subscription[] = [];
    const pendingMeltSubs: Subscription[] = [];
    const allMintSubIds = Object.keys(this.subscriptions.mint);
    const allMeltSubIds = Object.keys(this.subscriptions.melt);
    for (let i = 0; i < allMintSubIds.length; i++) {
      if (this.subscriptions.mint[allMintSubIds[i]].state === "pending") {
        pendingMintSubs.push(this.subscriptions.mint[allMintSubIds[i]]);
      }
    }
    for (let i = 0; i < allMeltSubIds.length; i++) {
      if (this.subscriptions.mint[allMeltSubIds[i]].state === "pending") {
        pendingMeltSubs.push(this.subscriptions.mint[allMeltSubIds[i]]);
      }
    }
    return { mint: pendingMintSubs, melt: pendingMeltSubs };
  }

  get subs() {
    return this.subscriptions;
  }
}
