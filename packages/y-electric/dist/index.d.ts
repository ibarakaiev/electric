import * as decoding from 'lib0/decoding';
import { ObservableV2 } from 'lib0/observable';
import { Row, ShapeStreamOptions, GetExtensions, Offset } from '@electric-sql/client';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as Y from 'yjs';
import { ObservableV2 as ObservableV2$1 } from 'lib0/observable.js';

type ConnectivityStatus = `connected` | `disconnected` | `connecting`;
/**
 * A function that handles send errors.
 * @param response The http response from the server if the server returned a response.
 * @param error An exception raised by the fetch client if the server did not return a response.
 * @returns A promise that resolves to true if the send request should be retried.
 */
type SendErrorRetryHandler = ({ response, error, }: {
    response?: Response;
    error?: unknown;
}) => Promise<boolean>;
/**
 * The Observable interface for the YElectric provider.
 *
 * @event resumeState emitted when the provider sends or receives an update. This is mainly consumed by ResumeStateProvider to persist the resume state.
 * @event sync Emitted when the provider receives an up-to-date control message from the server, meaning that the client caught up with latest changes from the server.
 * @event synced same as @event sync.
 * @event status Emitted when the provider's connectivity status changes.
 * @event "connection-close" Emitted when the client disconnects from the server, by unsubscribing from shapes.
 */
type YProvider = {
    resumeState: (resumeState: ResumeState) => void;
    sync: (state: boolean) => void;
    synced: (state: boolean) => void;
    status: (status: {
        status: `connecting` | `connected` | `disconnected`;
    }) => void;
    'connection-close': () => void;
};
/**
 * The Observable interface for a ResumeStateProvider
 * A resume state provider is used to persist the sync state of a document
 * This is composed of:
 * - The document shape offset and handle
 * - The state vector of the document synced to the server (optional)
 */
type ElectricResumeStateProvider = {
    synced: (state: ResumeState) => void;
};
/**
 * Options for the ElectricProvider.
 *
 * @template RowWithDocumentUpdate The type of the row that contains the document update.
 * @template RowWithAwarenessUpdate (optional) The type of the row that contains the awareness update.
 * @param documentUpdates Options for the document updates.
 * @param documentUpdates.shape Options for the document updates shape.
 * @param documentUpdates.sendUrl The URL to send the document updates to.
 * @param documentUpdates.getUpdateFromRow A function that returns the update column from the row.
 * @param documentUpdates.sendErrorRetryHandler (optional) A function that handles send errors.
 * @param awarenessUpdates (optional) Options for the awareness updates.
 * @param awarenessUpdates.shape Options for the awareness updates shape.
 * @param awarenessUpdates.sendUrl The URL to send the awareness updates to.
 * @param awarenessUpdates.getUpdateFromRow A function that returns the update column from the row.
 * @param awarenessUpdates.sendErrorRetryHandler (optional) A function that handles send errors.
 * @param resumeState (optional) The resume state to use for the provider. If no resume state the provider will fetch the entire shape.
 * @param connect (optional) Whether to automatically connect upon initialization.
 * @param fetchClient (optional) Custom fetch implementation to use for send requests.
 * @param debounceMs (optional) Debounce window in milliseconds for sending document updates. If 0 or undefined, debouncing is disabled and updates are sent immediately.
 */
type ElectricProviderOptions<RowWithDocumentUpdate extends Row<decoding.Decoder>, RowWithAwarenessUpdate extends Row<decoding.Decoder> = never> = {
    doc: Y.Doc;
    documentUpdates: {
        shape: ShapeStreamOptions<GetExtensions<RowWithDocumentUpdate>>;
        sendUrl: string | URL;
        getUpdateFromRow: (row: RowWithDocumentUpdate) => decoding.Decoder;
        sendErrorRetryHandler?: SendErrorRetryHandler;
    };
    awarenessUpdates?: {
        shape: ShapeStreamOptions<GetExtensions<RowWithAwarenessUpdate>>;
        sendUrl: string | URL;
        protocol: awarenessProtocol.Awareness;
        getUpdateFromRow: (row: RowWithAwarenessUpdate) => decoding.Decoder;
        sendErrorRetryHandler?: SendErrorRetryHandler;
    };
    resumeState?: ResumeState;
    connect?: boolean;
    fetchClient?: typeof fetch;
    debounceMs?: number;
};
type ResumeState = {
    document?: {
        offset: Offset;
        handle: string;
    };
    stableStateVector?: Uint8Array;
};

declare class ElectricProvider<RowWithDocumentUpdate extends Row<decoding.Decoder> = never, RowWithAwarenessUpdate extends Row<decoding.Decoder> = never> extends ObservableV2<YProvider> {
    private doc;
    private documentUpdates;
    private awarenessUpdates?;
    private _connected;
    private _synced;
    private resumeState;
    private sendingPendingChanges;
    private pendingChanges;
    private sendingAwarenessState;
    private pendingAwarenessUpdate;
    private debounceMs;
    private debounceTimer;
    private documentUpdateHandler;
    private awarenessUpdateHandler?;
    private exitHandler;
    private unsubscribeShapes?;
    private fetchClient?;
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
    constructor({ doc, documentUpdates: documentUpdatesConfig, awarenessUpdates: awarenessUpdatesConfig, resumeState, connect, fetchClient, debounceMs, }: ElectricProviderOptions<RowWithDocumentUpdate, RowWithAwarenessUpdate>);
    get synced(): boolean;
    set synced(state: boolean);
    set connected(state: boolean);
    get connected(): boolean;
    private batch;
    private clearDebounceTimer;
    private scheduleSendOperations;
    destroy(): void;
    disconnect(): void;
    connect(): void;
    private operationsShapeHandler;
    private applyDocumentUpdate;
    private sendOperations;
    private applyAwarenessUpdate;
    private awarenessShapeHandler;
}

/**
 * A ResumeStateProvider implementation using LocalStorage.
 * This is a reference implementation that can be used as a starting point
 * for implementing other ResumeStateProviders.
 */
declare class LocalStorageResumeStateProvider extends ObservableV2$1<ElectricResumeStateProvider> {
    private key;
    private resumeState?;
    constructor(key: string);
    subscribeToResumeState(provider: ElectricProvider): () => void;
    save(resumeState: ResumeState): void;
    load(): ResumeState;
}

/**
 * Utility to parse hex string bytea data to a decoder for YJS operations
 */
declare const parseToDecoder: {
    bytea: (hexString: string) => decoding.Decoder;
};

export { type ConnectivityStatus, ElectricProvider, type ElectricProviderOptions, type ElectricResumeStateProvider, LocalStorageResumeStateProvider, type ResumeState, type SendErrorRetryHandler, type YProvider, parseToDecoder };
