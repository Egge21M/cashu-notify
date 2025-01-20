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
      onUpdate: this.handleUpdate,
      onReconnect: this.handleReconnect,
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
      // this.debounceTimer = setTimeout(() => {
    }
    //   this.handlePendingSubscriptions();
    // }, 350) as unknown as number;
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

  // private handlePendingSubscriptions() {
  //   const pendingSubs = this.pendingSubscriptions;
  //   for (let i = 0; i < pendingSubs.mint.length; i++) {
  //     pendingSubs.mint[i]?.setOpening();
  //   }
  //   for (let i = 0; i < pendingSubs.melt.length; i++) {
  //     pendingSubs.melt[i]?.setOpening();
  //   }
  //   if (pendingSubs.mint.length > 0) {
  //     this.RPCManager.createSubscription(
  //       {
  //         kind: "bolt11_mint_quote",
  //         filters: pendingSubs.mint.map((s) => s.id),
  //       },
  //       pendingSubs.mint,
  //       this.handleUpdate,
  //       this.handleError,
  //     );
  //   }
  //   if (pendingSubs.melt.length > 0) {
  //     this.RPCManager.createSubscription(
  //       {
  //         kind: "bolt11_melt_quote",
  //         filters: pendingSubs.mint.map((s) => s.id),
  //       },
  //       pendingSubs.melt,
  //       this.handleUpdate,
  //       this.handleError,
  //     );
  //   }
  // }

  private handleUpdate(msg: JsonRpcNotification) {
    const subId = msg.params.subId;
    if (!this.subscriptions[subId]) {
      return;
    }
    this.subscriptions[subId].update(msg.params.payload);
  }

  // private get pendingSubscriptions() {
  //   const pendingMintSubs: Subscription[] = [];
  //   const pendingMeltSubs: Subscription[] = [];
  //   const allMintSubIds = Object.keys(this.subscriptions.mint);
  //   const allMeltSubIds = Object.keys(this.subscriptions.melt);
  //   for (let i = 0; i < allMintSubIds.length; i++) {
  //     const key = allMintSubIds[i] as keyof typeof this.subscriptions.mint;
  //     if (this.subscriptions.mint[key]?.state === "pending") {
  //       pendingMintSubs.push(this.subscriptions.mint[key]);
  //     }
  //   }
  //   for (let i = 0; i < allMeltSubIds.length; i++) {
  //     const key = allMeltSubIds[i] as keyof typeof this.subscriptions.melt;
  //     if (this.subscriptions.melt[key]?.state === "pending") {
  //       pendingMeltSubs.push(this.subscriptions.melt[key]);
  //     }
  //   }
  //   return { mint: pendingMintSubs, melt: pendingMeltSubs };
  // }

  handleReconnect() {
    const activeSubscriptions = Object.keys(this.subscriptions).map(
      (i) => this.subscriptions[i],
    );
    for (let i = 0; i > activeSubscriptions.length; i++) {
      const sub = activeSubscriptions[i] as Subscription;
      const kind =
        sub?.type === "mint" ? "bolt11_mint_quote" : "bolt11_melt_quote";
      this.RPCManager.createSubscription(
        { kind, filters: [sub.id] },
        [sub],
        sub.error,
      );
    }
  }

  get subs() {
    return this.subscriptions;
  }
}
