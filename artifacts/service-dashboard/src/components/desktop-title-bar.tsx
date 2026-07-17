import { useEffect, useState } from "react";
import { Activity, Minus, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDesktopBridge, isDesktopApp } from "@/lib/runtime";

export function DesktopTitleBar() {
  const bridge = getDesktopBridge();
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!bridge) return;
    void bridge.isMaximized().then(setMaximized);
  }, [bridge]);

  if (!isDesktopApp || !bridge) return null;

  const isMac = bridge.platform === "darwin";

  return (
    <header
      className={cn(
        "h-10 shrink-0 flex items-center border-b bg-card/80 backdrop-blur select-none",
        isMac ? "pl-[72px] pr-3" : "pl-3 pr-1",
      )}
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="bg-primary text-primary-foreground p-1 rounded-md">
          <Activity className="size-3.5" />
        </div>
        <span className="text-xs font-semibold tracking-tight truncate">
          ELANPRO Service Ops
        </span>
      </div>

      {!isMac && (
        <div
          className="ml-auto flex items-center"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <button
            type="button"
            aria-label="Minimize"
            className="h-8 w-10 inline-flex items-center justify-center hover:bg-muted/80 transition-colors"
            onClick={() => bridge.minimize()}
          >
            <Minus className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={maximized ? "Restore" : "Maximize"}
            className="h-8 w-10 inline-flex items-center justify-center hover:bg-muted/80 transition-colors"
            onClick={async () => {
              bridge.maximize();
              setMaximized(await bridge.isMaximized());
            }}
          >
            <Square className="size-3" />
          </button>
          <button
            type="button"
            aria-label="Close"
            className="h-8 w-10 inline-flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
            onClick={() => bridge.close()}
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </header>
  );
}
