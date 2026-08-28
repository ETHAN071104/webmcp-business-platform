import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const mockHost = "127.0.0.1";
const mockPort = 54321;
const useLocalMock = process.argv.includes("--mock");
const nextArguments = process.argv.slice(2).filter((argument) => argument !== "--mock");

function isPortListening(host, port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(400, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForPort(host, port, attempts = 30) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await isPortListening(host, port)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Local mock Supabase did not start on ${host}:${port}.`);
}

let mockProcess = null;
let nextProcess = null;
let shuttingDown = false;

function stopChild(child) {
  if (child && child.exitCode === null && !child.killed) child.kill();
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  stopChild(nextProcess);
  stopChild(mockProcess);
  process.exitCode = exitCode;
}

async function main() {
  if (useLocalMock) {
    if (!(await isPortListening(mockHost, mockPort))) {
      mockProcess = spawn(process.execPath, [join(projectRoot, "tests", "visual", "mock-supabase.mjs")], {
        cwd: projectRoot,
        stdio: "inherit",
      });
      mockProcess.once("exit", (code) => {
        if (!shuttingDown && code !== 0) shutdown(code ?? 1);
      });
      await waitForPort(mockHost, mockPort);
    } else {
      console.log(`Using the existing local data service on http://${mockHost}:${mockPort}`);
    }
  } else {
    console.log("Using Supabase configuration from the Next.js environment files.");
  }

  nextProcess = spawn(
    process.execPath,
    [join(projectRoot, "node_modules", "next", "dist", "bin", "next"), "dev", ...nextArguments],
    {
      cwd: projectRoot,
      stdio: "inherit",
      env: useLocalMock ? {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: `http://${mockHost}:${mockPort}`,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-mock-anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "local-mock-service-role-key",
      } : process.env,
    },
  );
  nextProcess.once("exit", (code) => shutdown(code ?? 0));
}

process.once("SIGINT", () => shutdown(0));
process.once("SIGTERM", () => shutdown(0));

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  shutdown(1);
});
