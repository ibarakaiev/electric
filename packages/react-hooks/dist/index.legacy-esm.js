var __getOwnPropSymbols = Object.getOwnPropertySymbols;
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

// src/react-hooks.tsx
import {
  Shape,
  ShapeStream
} from "@electric-sql/client";
import React from "react";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/with-selector.js";
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
  const newShapeStream = new ShapeStream(options);
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
  const newShape = new Shape(shapeStream);
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
  const useShapeData = React.useMemo(() => {
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
      return useSyncExternalStoreWithSelector(
        subscribe,
        getSnapshot,
        getSnapshot,
        selector
      );
    };
  }, [shape, selector]);
  return useShapeData();
}
export {
  getShape,
  getShapeStream,
  preloadShape,
  sortedOptionsHash,
  useShape
};
//# sourceMappingURL=index.legacy-esm.js.map