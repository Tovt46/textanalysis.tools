import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

async function fixture(t, nextSource, testSource = `
  import test from "node:test";
  console.log("FIXTURE_TEST_SUITE_STARTED");
  test("isolated fixture suite", () => {});
`) {
  const directory = await mkdtemp(join(tmpdir(), "textanalysis-test-runner-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await Promise.all([
    mkdir(join(directory, "scripts")),
    mkdir(join(directory, "tests")),
    mkdir(join(directory, "node_modules/next/dist/bin"), { recursive: true }),
  ]);
  // Exercise the actual runner with a sentinel suite, never the repository suite.
  await Promise.all([
    readFile(new URL("../scripts/run-rendered-tests.mjs", import.meta.url), "utf8")
      .then(source => writeFile(join(directory, "scripts/run-rendered-tests.mjs"), source)),
    writeFile(join(directory, "node_modules/next/dist/bin/next"), nextSource),
    writeFile(join(directory, "tests/sentinel.test.mjs"), testSource),
  ]);
  return directory;
}

function runHarness(t, directory, port) {
  const detached = process.platform !== "win32";
  const env = { ...process.env, TEST_PORT: String(port) };
  // This subprocess owns a separate fixture suite rather than nesting this suite.
  delete env.NODE_TEST_CONTEXT;
  const child = spawn(process.execPath, [join(directory, "scripts/run-rendered-tests.mjs")], {
    cwd: directory,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    detached,
  });
  const killTree = () => {
    try {
      if (detached) process.kill(-child.pid, "SIGKILL");
      else child.kill("SIGKILL");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  };
  t.after(killTree);
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    const timeout = setTimeout(() => {
      killTree();
      reject(new Error(`Rendered runner did not exit promptly.\n${stdout}\n${stderr}`));
    }, 8000);
    child.once("error", error => { clearTimeout(timeout); reject(error); });
    child.once("close", (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal, stdout, stderr });
    });
  });
}

async function listeningServer(t, handler) {
  const server = createServer(handler);
  server.listen({ host: "127.0.0.1", port: 0, exclusive: true });
  await once(server, "listening");
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  return server;
}

async function unusedPort(t) {
  const server = await listeningServer(t);
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test("rendered runner rejects an occupied port without probing the existing server or running tests", async t => {
  let requests = 0;
  const server = await listeningServer(t, (_request, response) => {
    requests += 1;
    response.end("unrelated healthy server");
  });
  const port = server.address().port;
  const directory = await fixture(t, `console.log("FIXTURE_NEXT_STARTED"); process.exit(1);`);
  const result = await runHarness(t, directory, port);
  assert.equal(result.code, 1, result.stderr);
  assert.equal(result.signal, null);
  assert.match(result.stderr, new RegExp(`TEST_PORT ${port} is already in use`));
  assert.doesNotMatch(result.stdout, /FIXTURE_NEXT_STARTED|FIXTURE_TEST_SUITE_STARTED/);
  assert.equal(requests, 0);
  assert.equal(server.listening, true);
});

test("rendered runner fails promptly when its Next child exits during startup", async t => {
  const port = await unusedPort(t);
  const directory = await fixture(t, `process.exit(23);`);
  const result = await runHarness(t, directory, port);
  assert.equal(result.code, 1, result.stderr);
  assert.match(result.stderr, /Next\.js server exited unexpectedly with code 23/);
  assert.doesNotMatch(result.stdout, /FIXTURE_TEST_SUITE_STARTED/);
});

test("rendered runner fails if its Next child exits while tests are running", async t => {
  const port = await unusedPort(t);
  const directory = await fixture(t, `
    require("node:http").createServer((request, response) => {
      response.end("ready");
      if (request.url === "/exit") setTimeout(() => process.exit(24), 50);
    }).listen(Number(process.env.PORT), "127.0.0.1");
  `, `
    import test from "node:test";
    console.log("FIXTURE_TEST_SUITE_STARTED");
    test("server must stay alive", async () => {
      await fetch(new URL("/exit", process.env.TEST_BASE_URL));
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("FIXTURE_TEST_SUITE_COMPLETED");
    });
  `);
  const result = await runHarness(t, directory, port);
  assert.equal(result.code, 1, result.stderr);
  assert.match(result.stderr, /Next\.js server exited unexpectedly with code 24/);
  assert.match(result.stdout, /FIXTURE_TEST_SUITE_STARTED/);
  assert.doesNotMatch(result.stdout, /FIXTURE_TEST_SUITE_COMPLETED/);
});

test("rendered runner runs its isolated suite successfully while its own server stays alive", async t => {
  const port = await unusedPort(t);
  const directory = await fixture(t, `
    require("node:http").createServer((_request, response) => {
      response.end("ready");
    }).listen(Number(process.env.PORT), "127.0.0.1");
  `);
  const result = await runHarness(t, directory, port);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.signal, null);
  assert.match(result.stdout, /FIXTURE_TEST_SUITE_STARTED/);
  assert.doesNotMatch(result.stderr, /Next\.js server exited unexpectedly/);
});
