// import { Packet } from "socket.io-parser";
// import { Manager } from "./manager.js";
// import { DefaultEventsMap, EventNames, EventParams, EventsMap, Emitter } from "@socket.io/component-emitter";
/**
 * An events map is an interface that maps event names to their value, which
 * represents the type of the `on` listener.
 */
interface EventsMap {
    [event: string]: any;
}

/**
 * The default events map, used if no EventsMap is given. Using this EventsMap
 * is equivalent to accepting all event names, and any data.
 */
interface DefaultEventsMap {
    [event: string]: (...args: any[]) => void;
}

/**
 * Returns a union type containing all the keys of an event map.
 */
type EventNames<Map extends EventsMap> = keyof Map & (string | symbol);

/** The tuple type representing the parameters of an event listener */
type EventParams<Map extends EventsMap, Ev extends EventNames<Map>> = Parameters<Map[Ev]>;

/**
 * The event names that are either in ReservedEvents or in UserEvents
 */
type ReservedOrUserEventNames<ReservedEventsMap extends EventsMap, UserEvents extends EventsMap> =
    | EventNames<ReservedEventsMap>
    | EventNames<UserEvents>;

/**
 * Type of a listener of a user event or a reserved event. If `Ev` is in
 * `ReservedEvents`, the reserved event listener is returned.
 */
type ReservedOrUserListener<
    ReservedEvents extends EventsMap,
    UserEvents extends EventsMap,
    Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>
> = FallbackToUntypedListener<
    Ev extends EventNames<ReservedEvents>
        ? ReservedEvents[Ev]
        : Ev extends EventNames<UserEvents>
        ? UserEvents[Ev]
        : never
>;

/**
 * Returns an untyped listener type if `T` is `never`; otherwise, returns `T`.
 *
 * This is a hack to mitigate https://github.com/socketio/socket.io/issues/3833.
 * Needed because of https://github.com/microsoft/TypeScript/issues/41778
 */
type FallbackToUntypedListener<T> = [T] extends [never] ? (...args: any[]) => void | Promise<void> : T;

/**
 * Strictly typed version of an `EventEmitter`. A `TypedEventEmitter` takes type
 * parameters for mappings of event names to event data types, and strictly
 * types method calls to the `EventEmitter` according to these event maps.
 *
 * @typeParam ListenEvents - `EventsMap` of user-defined events that can be
 * listened to with `on` or `once`
 * @typeParam EmitEvents - `EventsMap` of user-defined events that can be
 * emitted with `emit`
 * @typeParam ReservedEvents - `EventsMap` of reserved events, that can be
 * emitted by socket.io with `emitReserved`, and can be listened to with
 * `listen`.
 */
class Emitter<
    ListenEvents extends EventsMap,
    EmitEvents extends EventsMap,
    ReservedEvents extends EventsMap = {}
> {
    /**
     * Adds the `listener` function as an event listener for `ev`.
     *
     * @param ev Name of the event
     * @param listener Callback function
     */
    on<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        ev: Ev,
        listener: ReservedOrUserListener<ReservedEvents, ListenEvents, Ev>
    ): this;

    /**
     * Adds a one-time `listener` function as an event listener for `ev`.
     *
     * @param ev Name of the event
     * @param listener Callback function
     */
    once<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        ev: Ev,
        listener: ReservedOrUserListener<ReservedEvents, ListenEvents, Ev>
    ): this;

    /**
     * Removes the `listener` function as an event listener for `ev`.
     *
     * @param ev Name of the event
     * @param listener Callback function
     */
    off<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        ev?: Ev,
        listener?: ReservedOrUserListener<ReservedEvents, ListenEvents, Ev>
    ): this;

    /**
     * Emits an event.
     *
     * @param ev Name of the event
     * @param args Values to send to listeners of this event
     */
    emit<Ev extends EventNames<EmitEvents>>(ev: Ev, ...args: EventParams<EmitEvents, Ev>): this;

    /**
     * Emits a reserved event.
     *
     * This method is `protected`, so that only a class extending
     * `StrictEventEmitter` can emit its own reserved events.
     *
     * @param ev Reserved event name
     * @param args Arguments to emit along with the event
     */
    protected emitReserved<Ev extends EventNames<ReservedEvents>>(
        ev: Ev,
        ...args: EventParams<ReservedEvents, Ev>
    ): this;

    /**
     * Returns the listeners listening to an event.
     *
     * @param event Event name
     * @returns Array of listeners subscribed to `event`
     */
    listeners<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        event: Ev
    ): ReservedOrUserListener<ReservedEvents, ListenEvents, Ev>[];

    /**
     * Returns true if there is a listener for this event.
     *
     * @param event Event name
     * @returns boolean
     */
    hasListeners<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(event: Ev): boolean;

    /**
     * Removes the `listener` function as an event listener for `ev`.
     *
     * @param ev Name of the event
     * @param listener Callback function
     */
    removeListener<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        ev?: Ev,
        listener?: ReservedOrUserListener<ReservedEvents, ListenEvents, Ev>
    ): this;

    /**
     * Removes all `listener` function as an event listener for `ev`.
     *
     * @param ev Name of the event
     */
    removeAllListeners<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(ev?: Ev): this;
}
declare type PrependTimeoutError<T extends any[]> = {
    [K in keyof T]: T[K] extends (...args: infer Params) => infer Result
        ? (err: Error, ...args: Params) => Result
        : T[K];
};
/**
 * Utility type to decorate the acknowledgement callbacks with a timeout error.
 *
 * This is needed because the timeout() flag breaks the symmetry between the sender and the receiver:
 *
 * @example
 * interface Events {
 *   "my-event": (val: string) => void;
 * }
 *
 * socket.on("my-event", (cb) => {
 *   cb("123"); // one single argument here
 * });
 *
 * socket.timeout(1000).emit("my-event", (err, val) => {
 *   // two arguments there (the "err" argument is not properly typed)
 * });
 *
 */
declare type DecorateAcknowledgements<E> = {
    [K in keyof E]: E[K] extends (...args: infer Params) => infer Result
        ? (...args: PrependTimeoutError<Params>) => Result
        : E[K];
};
declare type Last<T extends any[]> = T extends [...infer H, infer L] ? L : any;
declare type AllButLast<T extends any[]> = T extends [...infer H, infer L] ? H : any[];
declare type FirstArg<T> = T extends (arg: infer Param) => infer Result ? Param : any;
interface SocketOptions {
    /**
     * the authentication payload sent when connecting to the Namespace
     */
    auth?:
        | {
              [key: string]: any;
          }
        | ((cb: (data: object) => void) => void);
    /**
     * The maximum number of retries. Above the limit, the packet will be discarded.
     *
     * Using `Infinity` means the delivery guarantee is "at-least-once" (instead of "at-most-once" by default), but a
     * smaller value like 10 should be sufficient in practice.
     */
    retries?: number;
    /**
     * The default timeout in milliseconds used when waiting for an acknowledgement.
     */
    ackTimeout?: number;
}
declare type DisconnectDescription =
    | Error
    | {
          description: string;
          context?: unknown;
      };
interface SocketReservedEvents {
    connect: () => void;
    connect_error: (err: Error) => void;
    disconnect: (reason: Socket.DisconnectReason, description?: DisconnectDescription) => void;
}
/**
 * A Socket is the fundamental class for interacting with the server.
 *
 * A Socket belongs to a certain Namespace (by default /) and uses an underlying {@link Manager} to communicate.
 *
 * @example
 * const socket = io();
 *
 * socket.on("connect", () => {
 *   console.log("connected");
 * });
 *
 * // send an event to the server
 * socket.emit("foo", "bar");
 *
 * socket.on("foobar", () => {
 *   // an event was received from the server
 * });
 *
 * // upon disconnection
 * socket.on("disconnect", (reason) => {
 *   console.log(`disconnected due to ${reason}`);
 * });
 */
declare class Socket<
    ListenEvents extends EventsMap = DefaultEventsMap,
    EmitEvents extends EventsMap = ListenEvents
> extends Emitter<ListenEvents, EmitEvents, SocketReservedEvents> {
    readonly io: Manager<ListenEvents, EmitEvents>;
    /**
     * A unique identifier for the session.
     *
     * @example
     * const socket = io();
     *
     * console.log(socket.id); // undefined
     *
     * socket.on("connect", () => {
     *   console.log(socket.id); // "G5p5..."
     * });
     */
    id: string;
    /**
     * The session ID used for connection state recovery, which must not be shared (unlike {@link id}).
     *
     * @private
     */
    private _pid;
    /**
     * The offset of the last received packet, which will be sent upon reconnection to allow for the recovery of the connection state.
     *
     * @private
     */
    private _lastOffset;
    /**
     * Whether the socket is currently connected to the server.
     *
     * @example
     * const socket = io();
     *
     * socket.on("connect", () => {
     *   console.log(socket.connected); // true
     * });
     *
     * socket.on("disconnect", () => {
     *   console.log(socket.connected); // false
     * });
     */
    connected: boolean;
    /**
     * Whether the connection state was recovered after a temporary disconnection. In that case, any missed packets will
     * be transmitted by the server.
     */
    recovered: boolean;
    /**
     * Credentials that are sent when accessing a namespace.
     *
     * @example
     * const socket = io({
     *   auth: {
     *     token: "abcd"
     *   }
     * });
     *
     * // or with a function
     * const socket = io({
     *   auth: (cb) => {
     *     cb({ token: localStorage.token })
     *   }
     * });
     */
    auth:
        | {
              [key: string]: any;
          }
        | ((cb: (data: object) => void) => void);
    /**
     * Buffer for packets received before the CONNECT packet
     */
    receiveBuffer: Array<ReadonlyArray<any>>;
    /**
     * Buffer for packets that will be sent once the socket is connected
     */
    sendBuffer: Array<Packet>;
    /**
     * The queue of packets to be sent with retry in case of failure.
     *
     * Packets are sent one by one, each waiting for the server acknowledgement, in order to guarantee the delivery order.
     * @private
     */
    private _queue;
    /**
     * A sequence to generate the ID of the {@link QueuedPacket}.
     * @private
     */
    private _queueSeq;
    private readonly nsp;
    private readonly _opts;
    private ids;
    private acks;
    private flags;
    private subs?;
    private _anyListeners;
    private _anyOutgoingListeners;
    /**
     * `Socket` constructor.
     */
    constructor(io: Manager, nsp: string, opts?: Partial<SocketOptions>);
    /**
     * Whether the socket is currently disconnected
     *
     * @example
     * const socket = io();
     *
     * socket.on("connect", () => {
     *   console.log(socket.disconnected); // false
     * });
     *
     * socket.on("disconnect", () => {
     *   console.log(socket.disconnected); // true
     * });
     */
    get disconnected(): boolean;
    /**
     * Subscribe to open, close and packet events
     *
     * @private
     */
    private subEvents;
    /**
     * Whether the Socket will try to reconnect when its Manager connects or reconnects.
     *
     * @example
     * const socket = io();
     *
     * console.log(socket.active); // true
     *
     * socket.on("disconnect", (reason) => {
     *   if (reason === "io server disconnect") {
     *     // the disconnection was initiated by the server, you need to manually reconnect
     *     console.log(socket.active); // false
     *   }
     *   // else the socket will automatically try to reconnect
     *   console.log(socket.active); // true
     * });
     */
    get active(): boolean;
    /**
     * "Opens" the socket.
     *
     * @example
     * const socket = io({
     *   autoConnect: false
     * });
     *
     * socket.connect();
     */
    connect(): this;
    /**
     * Alias for {@link connect()}.
     */
    open(): this;
    /**
     * Sends a `message` event.
     *
     * This method mimics the WebSocket.send() method.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
     *
     * @example
     * socket.send("hello");
     *
     * // this is equivalent to
     * socket.emit("message", "hello");
     *
     * @return self
     */
    send(...args: any[]): this;
    /**
     * Override `emit`.
     * If the event is in `events`, it's emitted normally.
     *
     * @example
     * socket.emit("hello", "world");
     *
     * // all serializable datastructures are supported (no need to call JSON.stringify)
     * socket.emit("hello", 1, "2", { 3: ["4"], 5: Uint8Array.from([6]) });
     *
     * // with an acknowledgement from the server
     * socket.emit("hello", "world", (val) => {
     *   // ...
     * });
     *
     * @return self
     */
    emit<Ev extends EventNames<EmitEvents>>(ev: Ev, ...args: EventParams<EmitEvents, Ev>): this;
    /**
     * @private
     */
    private _registerAckCallback;
    /**
     * Emits an event and waits for an acknowledgement
     *
     * @example
     * // without timeout
     * const response = await socket.emitWithAck("hello", "world");
     *
     * // with a specific timeout
     * try {
     *   const response = await socket.timeout(1000).emitWithAck("hello", "world");
     * } catch (err) {
     *   // the server did not acknowledge the event in the given delay
     * }
     *
     * @return a Promise that will be fulfilled when the server acknowledges the event
     */
    emitWithAck<Ev extends EventNames<EmitEvents>>(
        ev: Ev,
        ...args: AllButLast<EventParams<EmitEvents, Ev>>
    ): Promise<FirstArg<Last<EventParams<EmitEvents, Ev>>>>;
    /**
     * Add the packet to the queue.
     * @param args
     * @private
     */
    private _addToQueue;
    /**
     * Send the first packet of the queue, and wait for an acknowledgement from the server.
     * @param force - whether to resend a packet that has not been acknowledged yet
     *
     * @private
     */
    private _drainQueue;
    /**
     * Sends a packet.
     *
     * @param packet
     * @private
     */
    private packet;
    /**
     * Called upon engine `open`.
     *
     * @private
     */
    private onopen;
    /**
     * Sends a CONNECT packet to initiate the Socket.IO session.
     *
     * @param data
     * @private
     */
    private _sendConnectPacket;
    /**
     * Called upon engine or manager `error`.
     *
     * @param err
     * @private
     */
    private onerror;
    /**
     * Called upon engine `close`.
     *
     * @param reason
     * @param description
     * @private
     */
    private onclose;
    /**
     * Called with socket packet.
     *
     * @param packet
     * @private
     */
    private onpacket;
    /**
     * Called upon a server event.
     *
     * @param packet
     * @private
     */
    private onevent;
    private emitEvent;
    /**
     * Produces an ack callback to emit with an event.
     *
     * @private
     */
    private ack;
    /**
     * Called upon a server acknowlegement.
     *
     * @param packet
     * @private
     */
    private onack;
    /**
     * Called upon server connect.
     *
     * @private
     */
    private onconnect;
    /**
     * Emit buffered events (received and emitted).
     *
     * @private
     */
    private emitBuffered;
    /**
     * Called upon server disconnect.
     *
     * @private
     */
    private ondisconnect;
    /**
     * Called upon forced client/server side disconnections,
     * this method ensures the manager stops tracking us and
     * that reconnections don't get triggered for this.
     *
     * @private
     */
    private destroy;
    /**
     * Disconnects the socket manually. In that case, the socket will not try to reconnect.
     *
     * If this is the last active Socket instance of the {@link Manager}, the low-level connection will be closed.
     *
     * @example
     * const socket = io();
     *
     * socket.on("disconnect", (reason) => {
     *   // console.log(reason); prints "io client disconnect"
     * });
     *
     * socket.disconnect();
     *
     * @return self
     */
    disconnect(): this;
    /**
     * Alias for {@link disconnect()}.
     *
     * @return self
     */
    close(): this;
    /**
     * Sets the compress flag.
     *
     * @example
     * socket.compress(false).emit("hello");
     *
     * @param compress - if `true`, compresses the sending data
     * @return self
     */
    compress(compress: boolean): this;
    /**
     * Sets a modifier for a subsequent event emission that the event message will be dropped when this socket is not
     * ready to send messages.
     *
     * @example
     * socket.volatile.emit("hello"); // the server may or may not receive it
     *
     * @returns self
     */
    get volatile(): this;
    /**
     * Sets a modifier for a subsequent event emission that the callback will be called with an error when the
     * given number of milliseconds have elapsed without an acknowledgement from the server:
     *
     * @example
     * socket.timeout(5000).emit("my-event", (err) => {
     *   if (err) {
     *     // the server did not acknowledge the event in the given delay
     *   }
     * });
     *
     * @returns self
     */
    timeout(timeout: number): Socket<ListenEvents, DecorateAcknowledgements<EmitEvents>>;
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback.
     *
     * @example
     * socket.onAny((event, ...args) => {
     *   console.log(`got ${event}`);
     * });
     *
     * @param listener
     */
    onAny(listener: (...args: any[]) => void): this;
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback. The listener is added to the beginning of the listeners array.
     *
     * @example
     * socket.prependAny((event, ...args) => {
     *   console.log(`got event ${event}`);
     * });
     *
     * @param listener
     */
    prependAny(listener: (...args: any[]) => void): this;
    /**
     * Removes the listener that will be fired when any event is emitted.
     *
     * @example
     * const catchAllListener = (event, ...args) => {
     *   console.log(`got event ${event}`);
     * }
     *
     * socket.onAny(catchAllListener);
     *
     * // remove a specific listener
     * socket.offAny(catchAllListener);
     *
     * // or remove all listeners
     * socket.offAny();
     *
     * @param listener
     */
    offAny(listener?: (...args: any[]) => void): this;
    /**
     * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
     * e.g. to remove listeners.
     */
    listenersAny(): ((...args: any[]) => void)[];
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback.
     *
     * Note: acknowledgements sent to the server are not included.
     *
     * @example
     * socket.onAnyOutgoing((event, ...args) => {
     *   console.log(`sent event ${event}`);
     * });
     *
     * @param listener
     */
    onAnyOutgoing(listener: (...args: any[]) => void): this;
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback. The listener is added to the beginning of the listeners array.
     *
     * Note: acknowledgements sent to the server are not included.
     *
     * @example
     * socket.prependAnyOutgoing((event, ...args) => {
     *   console.log(`sent event ${event}`);
     * });
     *
     * @param listener
     */
    prependAnyOutgoing(listener: (...args: any[]) => void): this;
    /**
     * Removes the listener that will be fired when any event is emitted.
     *
     * @example
     * const catchAllListener = (event, ...args) => {
     *   console.log(`sent event ${event}`);
     * }
     *
     * socket.onAnyOutgoing(catchAllListener);
     *
     * // remove a specific listener
     * socket.offAnyOutgoing(catchAllListener);
     *
     * // or remove all listeners
     * socket.offAnyOutgoing();
     *
     * @param [listener] - the catch-all listener (optional)
     */
    offAnyOutgoing(listener?: (...args: any[]) => void): this;
    /**
     * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
     * e.g. to remove listeners.
     */
    listenersAnyOutgoing(): ((...args: any[]) => void)[];
    /**
     * Notify the listeners for each packet sent
     *
     * @param packet
     *
     * @private
     */
    private notifyOutgoingListeners;
}
declare namespace Socket {
    type DisconnectReason =
        | "io server disconnect"
        | "io client disconnect"
        | "ping timeout"
        | "transport close"
        | "transport error"
        | "parse error";
}
