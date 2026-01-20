import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { io as ioClient } from "socket.io-client";
import type { Socket } from "socket.io-client";

import { attach_sockets } from "../../../../sockets";
import type {
	ServerToClientEvents,
	ClientToServerEvents,
	FeedEvent
} from "../../../types";

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
	let t: NodeJS.Timeout;
	const timeout = new Promise<never>((_, reject) => {
		t = setTimeout(() => reject(new Error(`Timed out waiting for: ${label}`)), ms);
	});
	return Promise.race([p, timeout]).finally(() => clearTimeout(t!)) as Promise<T>;
}

function onceEvent<T>(socket: Socket<any, any>, event: string): Promise<T> {
	return new Promise((resolve) => socket.once(event, resolve));
}

function onceConnect(socket: Socket<any, any>): Promise<void> {
	return new Promise((resolve, reject) => {
		if (socket.connected) return resolve();

		const onErr = (err: any) => {
			socket.off("connect", onConnect);
			reject(err instanceof Error ? err : new Error(String(err)));
		};
		const onConnect = () => {
			socket.off("connect_error", onErr);
			resolve();
		};

		socket.once("connect", onConnect);
		socket.once("connect_error", onErr);
	});
}

describe("replay + sinceTs integration", () => {
	let server: http.Server;
	let port: number;

	beforeAll(async () => {
		// Use in-memory DB for tests (avoids Windows file locking / stale state)
		process.env.DB_FILE = ":memory:";

		const app = express();
		server = http.createServer(app);

		attach_sockets(server);

		await new Promise<void>((resolve) => server.listen(0, resolve));

		const addr = server.address();
		if (!addr || typeof addr === "string") throw new Error("No port");
		port = addr.port;
	}, 30000);

	afterAll(async () => {
		try {
			// @ts-ignore
			server.closeIdleConnections?.();
			// @ts-ignore
			server.closeAllConnections?.();
		} catch {
			// ignore
		}

		await new Promise<void>((resolve, reject) => {
			server.close((err) => (err ? reject(err) : resolve()));
		});
	}, 30000);

	it(
		"replays only missed events sinceTs",
		async () => {
			const url = `http://localhost:${port}`;

			let a: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
			let b: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

			try {
				// Client A
				a = ioClient(url, { transports: ["websocket"], forceNew: true });
				await withTimeout(onceConnect(a), 8000, "A connect");

				const aHistoryP = withTimeout(
					onceEvent<FeedEvent[]>(a, "history"),
					8000,
					"A history after join"
				);
				a.emit("join", { name: "a", channel: "general" });
				await aHistoryP;

				const ack1 = await withTimeout(
					new Promise<any>((resolve) => {
						a!.emit(
							"post_event",
							{ channel: "general", type: "MESSAGE_POSTED", text: "m1" },
							resolve
						);
					}),
					8000,
					"A ack for m1"
				);
				expect(ack1.ok).toBe(true);

				const ack2 = await withTimeout(
					new Promise<any>((resolve) => {
						a!.emit(
							"post_event",
							{ channel: "general", type: "MESSAGE_POSTED", text: "m2" },
							resolve
						);
					}),
					8000,
					"A ack for m2"
				);
				expect(ack2.ok).toBe(true);

				const lastSeenTs = ack2.event.ts as number;

				// Client B
				b = ioClient(url, { transports: ["websocket"], forceNew: true });
				await withTimeout(onceConnect(b), 8000, "B connect");

				const bHistoryP = withTimeout(
					onceEvent<FeedEvent[]>(b, "history"),
					8000,
					"B history after join"
				);
				b.emit("join", { name: "b", channel: "general" });
				const historyB = await bHistoryP;

				expect(historyB.some((e) => e.text === "m1")).toBe(true);
				expect(historyB.some((e) => e.text === "m2")).toBe(true);

				// IMPORTANT: move B off "general" so switching back triggers history emission
				const bToAlertsHistoryP = withTimeout(
					onceEvent<FeedEvent[]>(b, "history"),
					8000,
					"B history after switching to alerts"
				);
				b.emit("switch_channel", { channel: "alerts" });
				await bToAlertsHistoryP;

				// A posts two more messages while B is NOT on general
				await withTimeout(
					new Promise<any>((resolve) => {
						a!.emit(
							"post_event",
							{ channel: "general", type: "MESSAGE_POSTED", text: "m3" },
							resolve
						);
					}),
					8000,
					"A ack for m3"
				);

				await withTimeout(
					new Promise<any>((resolve) => {
						a!.emit(
							"post_event",
							{ channel: "general", type: "MESSAGE_POSTED", text: "m4" },
							resolve
						);
					}),
					8000,
					"A ack for m4"
				);

				// Now B switches back to general with sinceTs and should receive ONLY m3/m4
				const replayP = withTimeout(
					onceEvent<FeedEvent[]>(b, "history"),
					8000,
					"B history after switching back to general (replay)"
				);
				b.emit("switch_channel", { channel: "general", sinceTs: lastSeenTs });
				const replay = await replayP;

				const texts = replay.map((e) => e.text);
				expect(texts).toContain("m3");
				expect(texts).toContain("m4");
				expect(texts).not.toContain("m1");
				expect(texts).not.toContain("m2");
			} finally {
				try {
					a?.disconnect();
				} catch {}
				try {
					b?.disconnect();
				} catch {}
			}
		},
		30000
	);
}, 30000);
