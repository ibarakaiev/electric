var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
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

// src/y-electric.ts
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as awarenessProtocol from "y-protocols/awareness";
import { ObservableV2 } from "lib0/observable";
import * as env from "lib0/environment";
import * as Y from "yjs";
import {
  isChangeMessage,
  isControlMessage,
  ShapeStream
} from "@electric-sql/client";
var ElectricProvider = class extends ObservableV2 {
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
    const operationsStream = new ShapeStream(__spreadProps(__spreadValues(__spreadValues({}, this.documentUpdates.shape), this.resumeState.document), {
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
      const awarenessStream = new ShapeStream(__spreadProps(__spreadValues({}, this.awarenessUpdates.shape), {
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
      if (isChangeMessage(message)) {
        const decoder = this.documentUpdates.getUpdateFromRow(message.value);
        while (decoder.pos !== decoder.arr.length) {
          const operation = decoding.readVarUint8Array(decoder);
          Y.applyUpdate(this.doc, operation, `server`);
        }
      } else if (isControlMessage(message) && message.headers.control === `up-to-date`) {
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
      if (isChangeMessage(message)) {
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
import { ObservableV2 as ObservableV22 } from "lib0/observable.js";
import * as buffer from "lib0/buffer";
var LocalStorageResumeStateProvider = class extends ObservableV22 {
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
import * as decoding2 from "lib0/decoding";
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
export {
  ElectricProvider,
  LocalStorageResumeStateProvider,
  parseToDecoder
};
//# sourceMappingURL=index.mjs.map