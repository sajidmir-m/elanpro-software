const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("node:path");

const isDev = !app.isPackaged;
const DASHBOARD_DEV_URL = process.env.DASHBOARD_DEV_URL ?? "http://localhost:5173";

/** @type {BrowserWindow | null} */
let mainWindow = null;

function getUiIndexPath() {
  return path.join(__dirname, "..", "ui", "index.html");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#0a0a0a",
    title: "ELANPRO Service Ops",
    frame: process.platform === "darwin",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    ...(process.platform === "win32" || process.platform === "linux"
      ? { frame: false }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    void mainWindow.loadURL(DASHBOARD_DEV_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadFile(getUiIndexPath());
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("desktop:is-maximized", () => mainWindow?.isMaximized() ?? false);
ipcMain.on("desktop:minimize", () => mainWindow?.minimize());
ipcMain.on("desktop:maximize", () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.on("desktop:close", () => mainWindow?.close());

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
