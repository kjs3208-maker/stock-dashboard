import { BackupData } from "./storage";

const PASSCODE_KEY = "stock-dashboard.syncPasscode";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadSyncPasscode(): string {
  if (!isBrowser()) return "";
  try {
    return window.localStorage.getItem(PASSCODE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveSyncPasscode(passcode: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PASSCODE_KEY, passcode);
  } catch {
    // ignore
  }
}

export function clearSyncPasscode(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(PASSCODE_KEY);
  } catch {
    // ignore
  }
}

export interface SyncPayload {
  updatedAt: string;
  data: BackupData;
}

export type SyncStatus = "disabled" | "locked" | "unlocked" | "error";

export interface SyncCheckResult {
  status: SyncStatus;
  payload?: SyncPayload | null;
}

/** Checks whether server-side sync is configured and, if so, whether
 * `passcode` unlocks it - and returns the currently stored remote state
 * when it does. "disabled" means the server has no SYNC_PASSCODE/Upstash
 * env vars set yet, so the sync UI should stay fully hidden. */
export async function checkRemoteSync(passcode: string): Promise<SyncCheckResult> {
  try {
    const res = await fetch("/api/sync", { headers: { "x-sync-passcode": passcode } });
    if (res.status === 503) return { status: "disabled" };
    if (res.status === 401) return { status: "locked" };
    if (!res.ok) return { status: "error" };
    const json = await res.json();
    return { status: "unlocked", payload: (json.payload as SyncPayload | null) ?? null };
  } catch {
    return { status: "error" };
  }
}

export async function pushRemoteState(passcode: string, data: BackupData): Promise<boolean> {
  try {
    const payload: SyncPayload = { updatedAt: new Date().toISOString(), data };
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sync-passcode": passcode },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}
