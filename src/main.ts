import { Poller } from "./poller";
import { Socket } from "./socket";
import { SubManager } from "./SubManager";
import { Subscription } from "./subscription";
import { SocketOptions } from "./types";

type NotifierOptions = {
  logger?: (...args: any[]) => void;
  disableFallbackPolling?: boolean;
  socketOptions: SocketOptions;
};

export class Notifier {
  private socket: Socket;
  private poller?: Poller;

  constructor(
    private url: string,
    private options: NotifierOptions,
  ) {
    this.socket = new Socket({
      ...options.socketOptions,
      url,
      onMessage: this.onMessage,
    });
    if (!this.options.disableFallbackPolling) {
      this.poller = new Poller(url);
    }
  }

  onMintQuoteUpdate(
    mintQuoteId: string,
    callback: () => void,
    errorCallback: () => {},
  ) {}

  onMessage(e: MessageEvent) {}
}

const test = new SubManager("https://mint.minibits.cash/Bitcoin/v1/ws");

const button = document.createElement("button");
let counter = 1;
button.innerText = "Sub";
button.addEventListener("click", () => {
  test.addListener("mint", String(counter), {
    update: () => {
      console.log("Received update");
    },
    error: (e: Error) => {
      console.log(e);
    },
  });
  setTimeout(() => {
    test.handleReconnect();
  }, 5000);
  counter++;
});

document.body.appendChild(button);
