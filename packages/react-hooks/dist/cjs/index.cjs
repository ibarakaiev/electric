"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  getShape: () => getShape,
  getShapeStream: () => getShapeStream,
  preloadShape: () => preloadShape,
  sortedOptionsHash: () => sortedOptionsHash,
  useShape: () => useShape
});
module.exports = __toCommonJS(src_exports);

// src/react-hooks.tsx
var import_client = require("@electric-sql/client");
var import_react = __toESM(require("react"), 1);
var import_with_selector = require("use-sync-external-store/with-selector.js");
var streamCache = /* @__PURE__ */ new Map();
var shapeCache = /* @__PURE__ */ new Map();
async function preloadShape(options) {
  const shapeStream = getShapeStream(options);
  const shape = getShape(shapeStream);
  await shape.rows;
  return shape;
}
function sortObjectKeys(obj) {
  if (typeof obj === `function`) return Function.prototype.toString.call(obj);
  if (typeof obj !== `object` || obj === null) return obj;
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  return Object.keys(obj).sort().reduce((sorted, key) => {
    sorted[key] = sortObjectKeys(obj[key]);
    return sorted;
  }, {});
}
function sortedOptionsHash(options) {
  return JSON.stringify(sortObjectKeys(options));
}
function getShapeStream(options) {
  var _a;
  const shapeHash = sortedOptionsHash(options);
  if (streamCache.has(shapeHash)) {
    const stream = streamCache.get(shapeHash);
    if (!((_a = stream.options.signal) == null ? void 0 : _a.aborted)) {
      return stream;
    }
    streamCache.delete(shapeHash);
    shapeCache.delete(stream);
  }
  const newShapeStream = new import_client.ShapeStream(options);
  streamCache.set(shapeHash, newShapeStream);
  return newShapeStream;
}
function getShape(shapeStream) {
  var _a;
  if (shapeCache.has(shapeStream)) {
    if (!((_a = shapeStream.options.signal) == null ? void 0 : _a.aborted)) {
      return shapeCache.get(shapeStream);
    }
    streamCache.delete(sortedOptionsHash(shapeStream.options));
    shapeCache.delete(shapeStream);
  }
  const newShape = new import_client.Shape(shapeStream);
  shapeCache.set(shapeStream, newShape);
  return newShape;
}
function shapeSubscribe(shape, callback) {
  const unsubscribe = shape.subscribe(callback);
  return () => {
    unsubscribe();
  };
}
function parseShapeData(shape) {
  return {
    data: shape.currentRows,
    isLoading: shape.isLoading(),
    lastSyncedAt: shape.lastSyncedAt(),
    isError: shape.error !== false,
    shape,
    stream: shape.stream,
    error: shape.error
  };
}
function shapeResultChanged(oldRes, newRes) {
  return !oldRes || oldRes.isLoading !== newRes.isLoading || oldRes.lastSyncedAt !== newRes.lastSyncedAt || oldRes.isError !== newRes.isError || oldRes.error !== newRes.error || oldRes.shape.lastOffset !== newRes.shape.lastOffset || oldRes.shape.handle !== newRes.shape.handle;
}
function identity(arg) {
  return arg;
}
function useShape(_a) {
  var _b = _a, {
    selector = identity
  } = _b, options = __objRest(_b, [
    "selector"
  ]);
  const shapeStream = getShapeStream(
    options
  );
  const shape = getShape(shapeStream);
  const useShapeData = import_react.default.useMemo(() => {
    let latestShapeData;
    const getSnapshot = () => {
      latestShapeData != null ? latestShapeData : latestShapeData = parseShapeData(shape);
      return latestShapeData;
    };
    const subscribe = (onStoreChange) => {
      const newShapeData = parseShapeData(shape);
      if (shapeResultChanged(latestShapeData, newShapeData)) {
        latestShapeData = newShapeData;
        onStoreChange();
      }
      return shapeSubscribe(shape, () => {
        latestShapeData = parseShapeData(shape);
        onStoreChange();
      });
    };
    return () => {
      return (0, import_with_selector.useSyncExternalStoreWithSelector)(
        subscribe,
        getSnapshot,
        getSnapshot,
        selector
      );
    };
  }, [shape, selector]);
  return useShapeData();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getShape,
  getShapeStream,
  preloadShape,
  sortedOptionsHash,
  useShape
});
//# sourceMappingURL=index.cjs.map