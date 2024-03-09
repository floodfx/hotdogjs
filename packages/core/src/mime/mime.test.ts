import { beforeAll, expect, test } from "bun:test";
import { mime, nodeHttpFetch } from ".";

beforeAll(async () => {
  await mime.load();
});

test("test mime", () => {
  test("lookupMime by ext", async () => {
    expect(mime.loaded).toBeTruthy();
    expect(mime.lookupMimeType("pdf")).toContain("application/pdf");
  });

  test("lookupExt by mime", async () => {
    expect(mime.loaded).toBeTruthy();
    expect(mime.lookupExtensions("application/pdf")).toContain("pdf");
  });

  test("http requests success", async () => {
    const res = await nodeHttpFetch("https://cdn.jsdelivr.net/gh/jshttp/mime-db@master/db.json");
    expect(res).toBeTruthy();
  });
});
