<h1 align="center">cashu-notify</h1>

  <p align="center">
    An opinionated for cashu mint notifications 
    <br />
    <br />
  </p>
<!-- TABLE OF CONTENTS -->

## About The Project

cashu-notify provides a highly abstracted and easy to use API around the Cashu WebSocket spec.
I consider it a highly opinionated "framework" because it extends the basic realtime flow with quality-of-life improvements like automatic reconnectes and fallback polling.

## Getting Started

### Installation

1. Install from NPM
   ```sh
   npm i cashu-notify
   ```
2. Use in your projects

   ```ts
   import { Notifier } from "cashu-notify";

   const notifier = new Notifier("https://mint.com");
   notifier.onMintQuoteUpdate("quoteId", (payload) => {
     console.log(payload);
   });
   ```

### Node support

cashu-notify is written to work in the Browser and in node. However because NodeJS does not have a globally available WebSocket API you have to tell the library which to use

```ts
import { Notifier } from "cashu-notify";
import WebSocket from "ws";

const notifier = new Notifier("https://mint.com", { webSocket: WebSocket });
notifier.onMintQuoteUpdate("quoteId", (payload) => {
  console.log(payload);
});
```

## Roadmap

- [ ] Basic Architecture
  - [ ] RPC Manager
  - [ ] Reconnects and Resubscribes
- [ ] Mint Updates through WebSockets
- [ ] Melt Updates through WebSockets
- [ ] Proof Updates through WebSockets
- [ ] Fallback to Polling

## License

Distributed under the MIT license . See `LICENSE.txt` for more information.
