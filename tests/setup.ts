import { beforeEach } from "vitest";

// Some Node installations expose an incomplete localStorage object when
// --localstorage-file is present without a path. Give jsdom tests a predictable,
// browser-compatible store instead of depending on the host Node flags.
const values = new Map<string, string>();

const localStorageMock: Storage = {
  get length() {
    return values.size;
  },
  clear() {
    values.clear();
  },
  getItem(key: string) {
    return values.get(String(key)) ?? null;
  },
  key(index: number) {
    return Array.from(values.keys())[index] ?? null;
  },
  removeItem(key: string) {
    values.delete(String(key));
  },
  setItem(key: string, value: string) {
    values.set(String(key), String(value));
  },
};

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: localStorageMock,
});

beforeEach(() => values.clear());
