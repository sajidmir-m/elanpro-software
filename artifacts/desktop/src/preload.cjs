const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApp", {
  platform: process.platform,
  minimize: () => ipcRenderer.send("desktop:minimize"),
  maximize: () => ipcRenderer.send("desktop:maximize"),
  close: () => ipcRenderer.send("desktop:close"),
  isMaximized: () => ipcRenderer.invoke("desktop:is-maximized"),
});
