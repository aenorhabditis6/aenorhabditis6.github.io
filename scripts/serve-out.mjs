// Serves out/ the way a static host does, so the tests run against the files
// that actually get published rather than against the dev server — which has
// its own overlay, its own error handling and its own module graph.
//
// No dependency on purpose: the whole job is to serve a directory as its
// index.html and get a handful of content types right.
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const ROOT = resolve("out");
const PORT = Number(process.env.PORT ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const send = (res, code, body) => {
  res.writeHead(code, { "content-type": "text/plain; charset=utf-8" });
  res.end(body);
};

const server = createServer(async (req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    return send(res, 400, "bad request");
  }

  // normalize collapses ../, and the prefix test is what stops anything that
  // survives it from reading outside out/.
  const target = resolve(join(ROOT, normalize(pathname)));
  if (target !== ROOT && !target.startsWith(ROOT + sep)) {
    return send(res, 403, "forbidden");
  }

  let file = target;
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    await stat(file);
  } catch {
    return send(res, 404, "not found");
  }

  res.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    // The tests want to see a change the moment it is rebuilt.
    "cache-control": "no-store",
  });
  createReadStream(file).pipe(res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`serving out/ on http://127.0.0.1:${PORT}`);
});
