"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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
  ElectricProvider: () => ElectricProvider,
  LocalStorageResumeStateProvider: () => LocalStorageResumeStateProvider,
  parseToDecoder: () => parseToDecoder
});
module.exports = __toCommonJS(src_exports);

// src/y-electric.ts
var encoding = __toESM(require("lib0/encoding"), 1);
var decoding = __toESM(require("lib0/decoding"), 1);
var awarenessProtocol = __toESM(require("y-protocols/awareness"), 1);
var import_observable = require("lib0/observable");
var env = __toESM(require("lib0/environment"), 1);
var Y = __toESM(require("yjs"), 1);
var import_client = require("@electric-sql/client");
var ElectricProvider = class extends import_observable.ObservableV2 {
  /**
   * Creates a new ElectricProvider instance that connects YJS documents to Electric SQL.
   *
   * @constructor
   * @param {ElectricProviderOptions} options - Configuration options for the provider
   * @param {Y.Doc} options.doc - The YJS document to be synchronized
   * @param {Object} options.documentUpdates - Document updates configuration
   * @param {ShapeStreamOptions} options.documentUpdates.shape - Options for the document updates shape stream
   * @param {string|URL} options.documentUpdates.sendUrl - URL endpoint for sending document updates
   * @param {Function} options.documentUpdates.getUpdateFromRow - Function to extract document update from row
   * @param {SendErrorRetryHandler} [options.documentUpdates.sendErrorRetryHandler] - Error handler for retrying document updates
   * @param {Object} [options.awarenessUpdates] - Awareness updates configuration (optional)
   * @param {ShapeStreamOptions} options.awarenessUpdates.shape - Options for the awareness updates shape stream
   * @param {string|URL} options.awarenessUpdates.sendUrl - URL endpoint for sending awareness updates
   * @param {awarenessProtocol.Awareness} options.awarenessUpdates.protocol - Awareness protocol instance
   * @param {Function} options.awarenessUpdates.getUpdateFromRow - Function to extract awareness update from row
   * @param {SendErrorRetryHandler} [options.awarenessUpdates.sendErrorRetryHandler] - Error handler for retrying awareness updates
   * @param {ResumeState} [options.resumeState] - Resume state for the provider
   * @param {boolean} [options.connect=true] - Whether to automatically connect upon initialization
   * @param {typeof fetch} [options.fetchClient] - Custom fetch implementation to use for HTTP requests
   * @param {number} [options.debounceMs] - Debounce window in milliseconds for sending document updates. If 0 or undefined, debouncing is disabled.
   */
  constructor({
    doc,
    documentUpdates: documentUpdatesConfig,
    awarenessUpdates: awarenessUpdatesConfig,
    resumeState,
    connect = true,
    fetchClient,
    debounceMs
  }) {
    var _a;
    super();
    this._connected = false;
    this._synced = false;
    this.sendingPendingChanges = false;
    this.pendingChanges = null;
    this.sendingAwarenessState = false;
    this.pendingAwarenessUpdate = null;
    this.debounceTimer = null;
    this.doc = doc;
    this.documentUpdates = documentUpdatesConfig;
    this.awarenessUpdates = awarenessUpdatesConfig;
    this.resumeState = resumeState != null ? resumeState : {};
    this.debounceMs = debounceMs != null ? debounceMs : 0;
    this.fetchClient = fetchClient;
    this.exitHandler = () => {
      if (env.isNode && typeof process !== `undefined`) {
        process.on(`exit`, this.destroy.bind(this));
      }
    };
    this.documentUpdateHandler = this.doc.on(
      `update`,
      this.applyDocumentUpdate.bind(this)
    );
    if (this.awarenessUpdates) {
      this.awarenessUpdateHandler = this.applyAwarenessUpdate.bind(this);
      this.awarenessUpdates.protocol.on(`update`, this.awarenessUpdateHandler);
    }
    if ((_a = this.resumeState) == null ? void 0 : _a.stableStateVector) {
      this.pendingChanges = Y.encodeStateAsUpdate(
        this.doc,
        this.resumeState.stableStateVector
      );
    }
    if (connect) {
      this.connect();
    }
  }
  get synced() {
    return this._synced;
  }
  set synced(state) {
    if (this._synced !== state) {
      this._synced = state;
      this.emit(`synced`, [state]);
      this.emit(`sync`, [state]);
    }
  }
  set connected(state) {
    if (this._connected !== state) {
      this._connected = state;
      if (state) {
        this.sendOperations();
      }
      this.emit(`status`, [{ status: state ? `connected` : `disconnected` }]);
    }
  }
  get connected() {
    return this._connected;
  }
  batch(update) {
    if (this.pendingChanges) {
      this.pendingChanges = Y.mergeUpdates([this.pendingChanges, update]);
    } else {
      this.pendingChanges = update;
    }
  }
  clearDebounceTimer() {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
  scheduleSendOperations() {
    if (this.debounceMs > 0) {
      if (this.debounceTimer === null) {
        this.debounceTimer = setTimeout(async () => {
          this.debounceTimer = null;
          await this.sendOperations();
          if (this.pendingChanges && this.connected && !this.sendingPendingChanges) {
            this.scheduleSendOperations();
          }
        }, this.debounceMs);
      }
    } else {
      this.sendOperations();
    }
  }
  destroy() {
    var _a;
    this.clearDebounceTimer();
    this.disconnect();
    this.doc.off(`update`, this.documentUpdateHandler);
    (_a = this.awarenessUpdates) == null ? void 0 : _a.protocol.off(`update`, this.awarenessUpdateHandler);
    if (env.isNode && typeof process !== `undefined`) {
      process.off(`exit`, this.exitHandler);
    }
    super.destroy();
  }
  disconnect() {
    var _a;
    this.clearDebounceTimer();
    if (this.pendingChanges && this.connected) {
      this.sendOperations();
    }
    (_a = this.unsubscribeShapes) == null ? void 0 : _a.call(this);
    if (!this.connected) {
      return;
    }
    if (this.awarenessUpdates) {
      awarenessProtocol.removeAwarenessStates(
        this.awarenessUpdates.protocol,
        Array.from(this.awarenessUpdates.protocol.getStates().keys()).filter(
          (client) => client !== this.awarenessUpdates.protocol.clientID
        ),
        this
      );
      awarenessProtocol.removeAwarenessStates(
        this.awarenessUpdates.protocol,
        [this.awarenessUpdates.protocol.clientID],
        `local`
      );
      this.awarenessUpdates.protocol.setLocalState({});
    }
    this.emit(`connection-close`, []);
    this.pendingAwarenessUpdate = null;
    this.connected = false;
    this.synced = false;
  }
  connect() {
    if (this.connected) {
      return;
    }
    const abortController = new AbortController();
    const operationsStream = new import_client.ShapeStream(__spreadProps(__spreadValues(__spreadValues({}, this.documentUpdates.shape), this.resumeState.document), {
      signal: abortController.signal
    }));
    const operationsShapeUnsubscribe = operationsStream.subscribe(
      (messages) => {
        this.operationsShapeHandler(
          messages,
          operationsStream.lastOffset,
          operationsStream.shapeHandle
        );
      }
    );
    let awarenessShapeUnsubscribe;
    if (this.awarenessUpdates) {
      const awarenessStream = new import_client.ShapeStream(__spreadProps(__spreadValues({}, this.awarenessUpdates.shape), {
        signal: abortController.signal,
        offset: `now`
      }));
      awarenessShapeUnsubscribe = awarenessStream.subscribe(
        (messages) => {
          this.awarenessShapeHandler(messages);
        }
      );
    }
    this.unsubscribeShapes = () => {
      abortController.abort();
      operationsShapeUnsubscribe();
      awarenessShapeUnsubscribe == null ? void 0 : awarenessShapeUnsubscribe();
      this.unsubscribeShapes = void 0;
    };
    this.emit(`status`, [{ status: `connecting` }]);
  }
  operationsShapeHandler(messages, offset, handle) {
    for (const message of messages) {
      if ((0, import_client.isChangeMessage)(message)) {
        const decoder = this.documentUpdates.getUpdateFromRow(message.value);
        while (decoder.pos !== decoder.arr.length) {
          const operation = decoding.readVarUint8Array(decoder);
          Y.applyUpdate(this.doc, operation, `server`);
        }
      } else if ((0, import_client.isControlMessage)(message) && message.headers.control === `up-to-date`) {
        this.resumeState.document = {
          offset,
          handle
        };
        if (!this.sendingPendingChanges) {
          this.synced = true;
          this.resumeState.stableStateVector = Y.encodeStateVector(this.doc);
        }
        this.emit(`resumeState`, [this.resumeState]);
        this.connected = true;
      }
    }
  }
  async applyDocumentUpdate(update, origin) {
    if (origin === `server`) {
      return;
    }
    this.batch(update);
    this.scheduleSendOperations();
  }
  async sendOperations() {
    var _a;
    this.clearDebounceTimer();
    if (!this.connected || this.sendingPendingChanges) {
      return;
    }
    try {
      this.sendingPendingChanges = true;
      while (this.pendingChanges && this.pendingChanges.length > 2 && this.connected) {
        const sending = this.pendingChanges;
        this.pendingChanges = null;
        const encoder = encoding.createEncoder();
        encoding.writeVarUint8Array(encoder, sending);
        const success = await send(
          encoder,
          this.documentUpdates.sendUrl,
          (_a = this.fetchClient) != null ? _a : fetch,
          this.documentUpdates.sendErrorRetryHandler
        );
        if (!success) {
          this.batch(sending);
          this.disconnect();
        }
      }
      this.resumeState.stableStateVector = Y.encodeStateVector(this.doc);
      this.emit(`resumeState`, [this.resumeState]);
    } finally {
      this.sendingPendingChanges = false;
    }
  }
  async applyAwarenessUpdate(awarenessUpdate, origin) {
    var _a;
    if (origin !== `local` || !this.connected) {
      return;
    }
    this.pendingAwarenessUpdate = awarenessUpdate;
    if (this.sendingAwarenessState) {
      return;
    }
    this.sendingAwarenessState = true;
    try {
      while (this.pendingAwarenessUpdate && this.connected) {
        const update = this.pendingAwarenessUpdate;
        this.pendingAwarenessUpdate = null;
        const { added, updated, removed } = update;
        const changedClients = added.concat(updated).concat(removed);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(
            this.awarenessUpdates.protocol,
            changedClients
          )
        );
        const success = await send(
          encoder,
          this.awarenessUpdates.sendUrl,
          (_a = this.fetchClient) != null ? _a : fetch,
          this.awarenessUpdates.sendErrorRetryHandler
        );
        if (!success) {
          this.disconnect();
        }
      }
    } finally {
      this.sendingAwarenessState = false;
    }
  }
  awarenessShapeHandler(messages) {
    for (const message of messages) {
      if ((0, import_client.isChangeMessage)(message)) {
        if (message.headers.operation === `delete`) {
          awarenessProtocol.removeAwarenessStates(
            this.awarenessUpdates.protocol,
            [Number(message.value.client_id)],
            `remote`
          );
        } else {
          const decoder = this.awarenessUpdates.getUpdateFromRow(message.value);
          awarenessProtocol.applyAwarenessUpdate(
            this.awarenessUpdates.protocol,
            decoding.readVarUint8Array(decoder),
            this
          );
        }
      }
    }
  }
};
async function send(encoder, endpoint, fetchClient, retryHandler) {
  var _a;
  let response;
  const op = encoding.toUint8Array(encoder);
  try {
    response = await fetchClient(endpoint, {
      method: `PUT`,
      headers: {
        "Content-Type": `application/octet-stream`
      },
      body: op
    });
    if (!response.ok) {
      throw new Error(`Server did not return 2xx`);
    }
    return true;
  } catch (error) {
    const shouldRetry = await ((_a = retryHandler == null ? void 0 : retryHandler({
      response,
      error
    })) != null ? _a : false);
    return shouldRetry;
  }
}

// src/local-storage-resume-state.ts
var import_observable2 = require("lib0/observable.js");
var buffer = __toESM(require("lib0/buffer"), 1);
var LocalStorageResumeStateProvider = class extends import_observable2.ObservableV2 {
  constructor(key) {
    super();
    this.key = key;
  }
  subscribeToResumeState(provider) {
    const resumeStateHandler = provider.on(`resumeState`, this.save.bind(this));
    return () => provider.off(`resumeState`, resumeStateHandler);
  }
  save(resumeState) {
    const jsonPart = JSON.stringify({
      operations: resumeState.document
    });
    localStorage.setItem(this.key, jsonPart);
    if (resumeState.stableStateVector) {
      const vectorBase64 = buffer.toBase64(resumeState.stableStateVector);
      localStorage.setItem(`${this.key}_vector`, vectorBase64);
    } else {
      localStorage.removeItem(`${this.key}_vector`);
    }
  }
  load() {
    if (this.resumeState) {
      return this.resumeState;
    }
    const jsonData = localStorage.getItem(this.key);
    if (!jsonData) {
      this.emit(`synced`, [{}]);
    } else {
      this.resumeState = JSON.parse(jsonData);
      const vectorData = localStorage.getItem(`${this.key}_vector`);
      if (vectorData) {
        this.resumeState.stableStateVector = buffer.fromBase64(vectorData);
      }
      this.emit(`synced`, [this.resumeState]);
    }
    return this.resumeState;
  }
};

// src/utils.ts
var decoding2 = __toESM(require("lib0/decoding"), 1);
var hexStringToUint8Array = (hexString) => {
  const cleanHexString = hexString.startsWith(`\\x`) ? hexString.slice(2) : hexString;
  return new Uint8Array(
    cleanHexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
  );
};
var parseToDecoder = {
  bytea: (hexString) => {
    const uint8Array = hexStringToUint8Array(hexString);
    return decoding2.createDecoder(uint8Array);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ElectricProvider,
  LocalStorageResumeStateProvider,
  parseToDecoder
});
//# sourceMappingURL=index.cjs.map