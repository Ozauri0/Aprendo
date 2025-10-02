#!/usr/bin/env node
/* Safe Electron launcher for Linux (Wayland/X11) and other OSes.
 * - No uses sudo.
 * - En Linux, intenta usar Wayland si está disponible.
 * - Si user namespaces están deshabilitados (Ubuntu/hardening), avisa y
 *   SOLO usa --no-sandbox si exportas ELECTRON_ALLOW_NO_SANDBOX=1.
 * - Si corres como root, bloquea por defecto (a menos que exportes ELECTRON_ALLOW_ROOT_WITH_NO_SANDBOX=1).
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

function log(...args){ console.log("[launcher]", ...args); }
function warn(...args){ console.warn("[launcher][WARN]", ...args); }
function error(...args){ console.error("[launcher][ERROR]", ...args); }

const electronBin = require("electron"); // path al binario

// Previene ejecutar como root (Chromium lo prohíbe sin --no-sandbox)
const isLinux = process.platform === "linux";
const getuid = process.getuid ? process.getuid() : null;
const isRoot = typeof getuid === "function" ? getuid() === 0 : false;

const allowRootNoSandbox = process.env.ELECTRON_ALLOW_ROOT_WITH_NO_SANDBOX === "1";
const allowNoSandbox = process.env.ELECTRON_ALLOW_NO_SANDBOX === "1";

if (isRoot && !allowRootNoSandbox) {
  error("No ejecutes con sudo/root. Electron no soporta root sin --no-sandbox.");
  error("Si SOLO estás depurando y aceptas el riesgo, exporta:");
  error("  ELECTRON_ALLOW_ROOT_WITH_NO_SANDBOX=1");
  process.exit(1);
}

const args = [];
// Pasa argumentos del usuario al electron (ej: npm start -- --inspect=5858)
const passThrough = process.argv.slice(2);

// Detección de sesión (Wayland vs X11)
let ozoneFlag = null;
if (isLinux) {
  const isWayland =
    !!process.env.WAYLAND_DISPLAY ||
    process.env.XDG_SESSION_TYPE === "wayland" ||
    process.env.XDG_CURRENT_DESKTOP?.toLowerCase().includes("wayland");

  if (isWayland) {
    ozoneFlag = "--ozone-platform=wayland";
    args.push("--enable-features=UseOzonePlatform,WaylandWindowDecorations");
  } else {
    ozoneFlag = "--ozone-platform=x11";
  }
  args.push(ozoneFlag);

  // Verifica user namespaces (sandbox)
  let userns = "1";
  try {
    userns = fs.readFileSync("/proc/sys/kernel/unprivileged_userns_clone", "utf8").trim();
  } catch {
    // Algunos kernels/containers no tienen este archivo; asumimos permitido.
  }

  if (userns === "0") {
    warn("El kernel tiene deshabilitados los unprivileged user namespaces.");
    warn("Recomendado: habilita con:");
    warn("  sudo sysctl -w kernel.unprivileged_userns_clone=1");
    warn("  echo 'kernel.unprivileged_userns_clone=1' | sudo tee /etc/sysctl.d/90-userns.conf && sudo sysctl --system");
    if (allowNoSandbox || allowRootNoSandbox) {
      warn("Usando --no-sandbox porque lo permitiste vía variable de entorno.");
      args.push("--no-sandbox");
    } else {
      warn("No usaré --no-sandbox por seguridad. Si necesitas probar, exporta ELECTRON_ALLOW_NO_SANDBOX=1");
    }
  }

  // Sugerencia por XDG_RUNTIME_DIR
  if (!process.env.XDG_RUNTIME_DIR) {
    warn("XDG_RUNTIME_DIR no está definido. En Wayland puede causar problemas.");
  }
}

// Logging útil para depurar
if (process.env.ELECTRON_ENABLE_LOGGING === "1" || process.env.ELECTRON_DEBUG === "1") {
  args.push("--enable-logging=stderr");
}

// Punto de entrada de tu app
const appEntry = "."; // tu carpeta del proyecto con main.js

// Lanza Electron
const child = spawn(electronBin, [...args, appEntry, ...passThrough], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    error(`Electron salió por señal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 0);
});
