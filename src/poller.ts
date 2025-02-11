import { Queue } from "./queue";
import { Subscription } from "./subscription";

const POLLER_DEFAULT_CONFIG = {
  intervalTime: 3000,
};

export class Poller {
  logger?: () => {};
  intervalTime: number;
  interval?: number;
  queue: Queue<Subscription>;

  constructor(config: any) {
    this.intervalTime = config.interval || POLLER_DEFAULT_CONFIG.intervalTime;
    this.queue = new Queue();
  }

  handleQueue() {
    const sub = this.queue.dequeue();
    if (!sub) {
      clearInterval(this.interval);
      return;
    }
    this.handleSub(sub);
  }

  handleSub(sub: Subscription) {
    const res = sub.pollForUpdate();
  }
}
