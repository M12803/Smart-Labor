// Guarded PWA registration wrapper.
// Refuses to register in dev, iframes, Lovable preview hosts, or when ?sw=off.
// In refused contexts, unregisters any existing /sw.js to avoid stale caches.

import { toast } from "sonner";

function isRefusedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const host = window.location.hostname;
  if (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  ) {
    return true;
  }
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterExisting() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith("/sw.js");
        })
        .map((r) => r.unregister()),
    );
  } catch {
    /* noop */
  }
}

export async function registerPWA() {
  if (typeof window === "undefined") return;
  if (isRefusedContext()) {
    await unregisterExisting();
    return;
  }
  if (!("serviceWorker" in navigator)) return;

  try {
    const { Workbox } = await import("workbox-window");
    const wb = new Workbox("/sw.js");

    wb.addEventListener("waiting", () => {
      toast.message("يتوفر إصدار جديد من التطبيق", {
        description: "اضغط للتحديث الآن.",
        duration: 15000,
        action: {
          label: "تحديث",
          onClick: () => {
            wb.addEventListener("controlling", () => window.location.reload());
            wb.messageSkipWaiting();
          },
        },
      });
    });

    await wb.register();
  } catch (err) {
    console.warn("PWA registration failed", err);
  }
}
