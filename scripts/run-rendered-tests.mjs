import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { setTimeout as wait } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.TEST_PORT || 3000);
const BASE_URL = `http://127.0.0.1:${PORT}`;

const nextBinary = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const server = spawn(process.execPath, [nextBinary, "start", "--hostname", "127.0.0.1", "--port", String(PORT)], {
  env: { ...process.env, NODE_ENV: "production", PORT: String(PORT) },
  stdio: ["ignore", "pipe", "pipe"],
});

const logs = [];
const onData = (source) => (chunk) => {
  logs.push(chunk.toString());
  process.stdout.write(`[next:${source}] ${chunk}`);
};
server.stdout.on("data", onData("out"));
server.stderr.on("data", onData("err"));

const testCommand = async () => {
  try {
    let serverReady = false;
    for (let i = 0; i < 45; i += 1) {
      try {
        const response = await fetch(new URL("/", BASE_URL), { redirect: "manual" });
        if (response.status < 500) {
          serverReady = true;
          break;
        }
      } catch (error) {
        if (error.name !== "TypeError") {
          console.error(error);
        }
      }
      await wait(500);
    }

    if (!serverReady) {
      throw new Error("Next.js server did not become ready for rendered tests.");
    }

    const testDirectory=new URL("../tests/",import.meta.url);
    const testFiles=(await readdir(testDirectory))
      .filter(file=>file.endsWith(".test.mjs"))
      .sort()
      .map(file=>fileURLToPath(new URL(file,testDirectory)));
    const testRunner = spawn(process.execPath, ["--test", ...testFiles], {
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
  } finally {
    server.kill("SIGTERM");
  }
};

try {
  const exitCode = await testCommand();
  process.exit(exitCode);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  server.kill("SIGTERM");
  process.exit(1);
}
