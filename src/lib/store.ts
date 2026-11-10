import { promises as fs } from "fs";
import path from "path";
import { createDefaultStore } from "./defaults";
import type { AppStore } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

let memory: AppStore | null = null;
let writeChain: Promise<void> = Promise.resolve();

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readFromDisk(): Promise<AppStore | null> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return JSON.parse(raw) as AppStore;
  } catch {
    return null;
  }
}

async function writeToDisk(store: AppStore) {
  await ensureDir();
  const tmp = `${STORE_PATH}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tmp, STORE_PATH);
}

export async function getStore(): Promise<AppStore> {
  if (memory) return memory;
  const disk = await readFromDisk();
  memory = disk ?? createDefaultStore();
  if (!disk) {
    await writeToDisk(memory);
  }
  return memory;
}

export async function updateStore(
  mutator: (store: AppStore) => void | Promise<void>,
): Promise<AppStore> {
  const next = await new Promise<AppStore>((resolve, reject) => {
    writeChain = writeChain
      .then(async () => {
        const current = await getStore();
        const clone = structuredClone(current) as AppStore;
        await mutator(clone);
        memory = clone;
        await writeToDisk(clone);
        resolve(clone);
      })
      .catch(reject);
  });
  return next;
}

export async function resetStore(): Promise<AppStore> {
  memory = createDefaultStore();
  await writeToDisk(memory);
  return memory;
}
