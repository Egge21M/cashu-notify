import { Listeners } from "./types";

export class Subscription {
  type: "mint" | "melt";
  id: string;
  state: "pending" | "active" | "expired" = "pending";
  private listeners: Listeners[] = [];
  constructor(type: "mint" | "melt", id: string) {
    this.type = type;
    this.id = id;
  }

  update(...args: any[]) {
    this.listeners.forEach((l) => l.update(...args));
  }

  error(e: Error) {
    this.listeners.forEach((l) => l.error(this.type, this.id, e));
  }

  attachListener(listeners: Listeners) {
    this.listeners.push(listeners);
  }

  removeListener(listeners: Listeners) {
    if (this.listeners.length < 2) {
      this.listeners = [];
    } else {
      this.listeners = this.listeners.filter((l) => l !== listeners);
    }
  }

  setActive() {
    this.state = "active";
  }

  get listenerCount() {
    return this.listeners.length;
  }
}
