import { createServer } from "node:http";
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { app } from "../../src/index.js";

type RequestInitWithDuplex = RequestInit & {
  duplex?: "half";
};

function headersFromIncoming(headers: IncomingHttpHeaders): Headers {
  const outgoing = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) outgoing.append(key, item);
    } else {
      outgoing.set(key, value);
    }
  }
  return outgoing;
}

function requestBody(req: IncomingMessage): ReadableStream<Uint8Array> | undefined {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  return Readable.toWeb(req) as ReadableStream<Uint8Array>;
}

async function writeFetchResponse(fetchResponse: Response, res: ServerResponse): Promise<void> {
  res.statusCode = fetchResponse.status;
  fetchResponse.headers.forEach((value, key) => res.setHeader(key, value));

  if (!fetchResponse.body) {
    res.end();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    Readable.fromWeb(fetchResponse.body).on("error", reject).on("end", resolve).pipe(res);
  });
}

const server = createServer((req, res) => {
  void (async () => {
    const host = req.headers.host ?? `127.0.0.1:${process.env.PORT ?? "0"}`;
    const url = new URL(req.url ?? "/", `http://${host}`);
    const init: RequestInitWithDuplex = {
      method: req.method,
      headers: headersFromIncoming(req.headers),
      body: requestBody(req),
      duplex: "half",
    };
    const fetchResponse = await app.fetch(new Request(url, init));
    await writeFetchResponse(fetchResponse, res);
  })().catch((err: unknown) => {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : "Unhandled test server error" }));
  });
});

server.listen(Number(process.env.PORT ?? "0"), "127.0.0.1", () => {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to determine local server port");
  }
  process.stdout.write(`${JSON.stringify({ event: "listening", port: address.port })}\n`);
});

function shutdown(): void {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
