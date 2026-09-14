import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { createServer } from "node:net";
import { setTimeout as wait } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.TEST_PORT || 3000);
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function assertPortAvailable() {
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error("TEST_PORT must be an integer between 1 and 65535.");
  }
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", (error) => {
      reject(new Error(error.code === "EADDRINUSE"
        ? `TEST_PORT ${PORT} is already in use at 127.0.0.1; rendered tests require their own Next.js server.`
        : `Cannot bind rendered test port ${PORT}: ${error.message}`));
    });
    probe.listen({ port: PORT, host: "127.0.0.1", exclusive: true }, () => {
      probe.close((error) => error ? reject(error) : resolve());
    });
  });
}

const testCommand = async () => {
  await assertPortAvailable();
  const nextBinary = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
  const server = spawn(process.execPath, [nextBinary, "start", "--hostname", "127.0.0.1", "--port", String(PORT)], {
    env: { ...process.env, NODE_ENV: "production", PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const controller = new AbortController();
  let stopping = false;
  let testRunner;
  const serverFailure = new Promise((resolve, reject) => {
    server.once("error", (error) => reject(new Error(`Next.js server could not start: ${error.message}`)));
    server.once("exit", (code, signal) => {
      if (!stopping) {
        reject(new Error(`Next.js server exited unexpectedly ${signal ? `with signal ${signal}` : `with code ${code}`}.`));
      }
    });
  });
  const onData = (source) => (chunk) => process.stdout.write(`[next:${source}] ${chunk}`);
  server.stdout.on("data", onData("out"));
  server.stderr.on("data", onData("err"));

  const runTests = async () => {
    let serverReady = false;
    for (let i = 0; i < 45; i += 1) {
      controller.signal.throwIfAborted();
      try {
        const response = await fetch(new URL("/", BASE_URL), {
          redirect: "manual",
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(1000)]),
        });
        await response.body?.cancel();
        if (response.status < 500) {
          serverReady = true;
          break;
        }
      } catch (error) {
        controller.signal.throwIfAborted();
        if (error.name !== "TypeError" && error.name !== "TimeoutError") {
          console.error(error);
        }
      }
      await wait(500, undefined, { signal: controller.signal });
    }

    if (!serverReady) {
      throw new Error("Next.js server did not become ready for rendered tests.");
    }

    const testDirectory=new URL("../tests/",import.meta.url);
    const testFiles=(await readdir(testDirectory))
      .filter(file=>file.endsWith(".test.mjs"))
      .sort()
      .map(file=>fileURLToPath(new URL(file,testDirectory)));
    controller.signal.throwIfAborted();
    testRunner = spawn(process.execPath, ["--test", ...testFiles], {
      stdio: "inherit",
      env: {
        ...process.env,
        TEST_BASE_URL: BASE_URL,
      },
    });

    const testExit = await new Promise((resolve, reject) => {
      testRunner.once("exit", (code, signal) => {
        if (signal) {
          return reject(new Error(`Tests exited with signal ${signal}`));
        }
        resolve(code ?? 0);
      });
      testRunner.once("error", reject);
    });

    if (testExit !== 0) {
      throw new Error(`Rendered test suite exited with code ${testExit}`);
    }
  };

  try {
    await Promise.race([runTests(), serverFailure]);
  } finally {
    stopping = true;
    controller.abort();
    testRunner?.kill("SIGTERM");
    server.kill("SIGTERM");
  }
};

try {
  await testCommand();
  process.exitCode = 0;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
