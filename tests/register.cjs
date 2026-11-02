const Module = require("node:module");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { randomUUID } = require("node:crypto");
const secure = new Map();
const legacy = new Map();
const controls = { failSecureWrite: false, failSecureRead: false };
const mocked = {
  "react-native": {
    Platform: { OS: "ios", Version: 18 },
    Alert: { alert() {} },
  },
  "expo-crypto": { randomUUID },
  "expo-application": { getAndroidId: () => "test-device" },
  "expo-router": { router: { replace() {} } },
  "expo-secure-store": {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: "device-only",
    getItemAsync: async (key) => {
      if (controls.failSecureRead) throw Error("locked");
      return secure.get(key) ?? null;
    },
    setItemAsync: async (key, value) => {
      if (controls.failSecureWrite) throw Error("locked");
      secure.set(key, value);
    },
    deleteItemAsync: async (key) => {
      if (controls.failSecureWrite) throw Error("locked");
      secure.delete(key);
    },
  },
  "@react-native-async-storage/async-storage": {
    getItem: async (key) => legacy.get(key) ?? null,
    setItem: async (key, value) => {
      legacy.set(key, value);
    },
    removeItem: async (key) => {
      legacy.delete(key);
    },
  },
};
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (Object.hasOwn(mocked, request)) return mocked[request];
  if (request.startsWith("@/"))
    request = path.join(__dirname, "..", request.slice(2));
  return originalLoad.call(this, request, parent, isMain);
};
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  module._compile(outputText, filename);
};
module.exports = { secure, legacy, controls, mocked };
