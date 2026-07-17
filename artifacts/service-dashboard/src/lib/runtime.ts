export type DesktopAppBridge = {
  platform: NodeJS.Platform;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
};

declare global {
  interface Window {
    desktopApp?: DesktopAppBridge;
  }
}

export const isDesktopApp =
  import.meta.env.VITE_APP_TARGET === "desktop" || Boolean(window.desktopApp);

export function getDesktopBridge(): DesktopAppBridge | null {
  return window.desktopApp ?? null;
}
