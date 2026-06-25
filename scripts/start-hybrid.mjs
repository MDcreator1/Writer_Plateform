import { spawn, execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { request } from "node:http";
import { connect } from "node:net";
import { resolve } from "node:path";

const mode = process.argv[2] === "start" ? "start" : "dev";
const cwd = process.cwd();
const children = new Set();
let shuttingDown = false;

function loadEnvFile(fileName) {
  const filePath = resolve(cwd, fileName);
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    if (process.env[key] !== undefined) continue;
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const studioHost = process.env.WRITING_STUDIO_HOST || "127.0.0.1";
const studioPort = Number(process.env.WRITING_STUDIO_PORT || 5500);
const studioEntry = "/story-novel-project-editor.html";
const nextPort = Number(process.env.PORT || 3000);

function portIsOpen(host, port) {
  return new Promise((resolvePort) => {
    const socket = connect({ host, port });
    const finish = (open) => {
      socket.removeAllListeners();
      socket.destroy();
      resolvePort(open);
    };
    socket.setTimeout(500);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function isWritingStudioServer() {
  return new Promise((resolveCheck) => {
    const check = request({
      host: studioHost,
      port: studioPort,
      path: studioEntry,
      method: "GET",
      timeout: 1200
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        if (body.length < 120000) body += chunk;
      });
      response.on("end", () => {
        resolveCheck(response.statusCode === 200 && body.includes("05-platform-integration.js"));
      });
    });
    check.once("timeout", () => {
      check.destroy();
      resolveCheck(false);
    });
    check.once("error", () => resolveCheck(false));
    check.end();
  });
}

function launch(label, args, options = {}) {
  const child = spawn(process.execPath, args, {
    cwd,
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
    ...options
  });
  children.add(child);
  child.once("exit", (code, signal) => {
    children.delete(child);
    if (shuttingDown) return;
    if (label === "Writer Platform") {
      console.error(`${label} stopped${signal ? ` (${signal})` : ` with code ${code ?? 0}`}.`);
      shutdown(code ?? 1);
    } else if ((code ?? 0) !== 0) {
      console.error(`${label} stopped with code ${code}.`);
      shutdown(code ?? 1);
    }
  });
  child.once("error", (error) => {
    console.error(`${label} could not start: ${error.message}`);
    shutdown(1);
  });
  return child;
}

function killProcessOnPort(port) {
  try {
    if (process.platform === "win32") {
      const output = execSync("netstat -ano").toString();
      const lines = output.split("\n");
      for (const line of lines) {
        if (line.includes(`:${port}`) && line.includes("LISTENING")) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(Number(pid)) && pid !== "0") {
            console.log(`Releasing port ${port} (killing process ${pid})...`);
            execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
          }
        }
      }
    } else {
      try {
        execSync(`lsof -t -i:${port} | xargs kill -9`, { stdio: "ignore" });
      } catch {
        try {
          execSync(`fuser -k ${port}/tcp`, { stdio: "ignore" });
        } catch {}
      }
    }
  } catch (err) {
    // Ignore error
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  killProcessOnPort(studioPort);
  killProcessOnPort(nextPort);
  setTimeout(() => process.exit(exitCode), 250).unref();
}

process.once("SIGINT", () => shutdown(0));
process.once("SIGTERM", () => shutdown(0));

// Forcefully clean up any orphaned dev processes on our ports before starting
console.log("Cleaning up dev ports...");
killProcessOnPort(studioPort);
killProcessOnPort(nextPort);

const studioPortOpen = await portIsOpen(studioHost, studioPort);
if (studioPortOpen) {
  if (!(await isWritingStudioServer())) {
    console.error(`Port ${studioPort} is already occupied by another application. Writing Studio cannot start.`);
    process.exit(1);
  }
  console.log(`Writing Studio already running: http://localhost:${studioPort}${studioEntry}`);
} else {
  launch("Writing Studio", [resolve(cwd, "Writer_studio/server.mjs")]);
}

const nextCli = resolve(cwd, "node_modules/next/dist/bin/next");
const nextArgs = mode === "dev"
  ? [nextCli, "dev", "-p", String(nextPort)]
  : [nextCli, "start", "-p", String(nextPort)];

console.log(`Writer Platform and Writing Studio are starting together (${mode}).`);
launch("Writer Platform", nextArgs);