import type { IncomingMessage, ServerResponse, Server } from "http";
import { Server as IoServer } from "socket.io";
import { insertEvent, getRecentEvents, getEventsSince } from "./src/lib/server/db";
import { validatePostEvent } from "./src/lib/server/validation";

import type {
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData,
	Channel,
	FeedEvent,
	UserPresence,
	PostEventPayload,
} from "./src/types";

const CHANNELS: Channel[] = ["general", "alerts", "incidents"];
const HISTORY_LIMIT = 50;

function makeId() {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function attach_sockets(
	server: Server<typeof IncomingMessage, typeof ServerResponse>
) {
	let users: UserPresence[] = [];

	const io = new IoServer<
		ClientToServerEvents,
		ServerToClientEvents,
		InterServerEvents,
		SocketData
	>(server);

	function emitUsers(channel: Channel) {
		const channelUsers = users.filter((u) => u.channel === channel);
		io.to(channel).emit("users", channelUsers);
	}

	async function pushEvent(e: FeedEvent) {
		await insertEvent(e);
		io.to(e.channel).emit("event", e);
	}

	function systemEvent(channel: Channel, text: string): FeedEvent {
		return {
			id: makeId(),
			ts: Date.now(),
			channel,
			type: "MESSAGE_POSTED",
			author: "",
			text,
			system: true,
		};
	}

	io.on("connection", (socket) => {
		socket.on("join", async ({ name, channel, sinceTs }) => {
			const safeChannel: Channel = CHANNELS.includes(channel) ? channel : "general";

			const isResync =
				socket.data.name === name && socket.data.channel === safeChannel;

			socket.data.name = name;
			socket.data.channel = safeChannel;

			socket.join(safeChannel);

			const history =
				typeof sinceTs === "number"
					? await getEventsSince(safeChannel, sinceTs, HISTORY_LIMIT)
					: await getRecentEvents(safeChannel, HISTORY_LIMIT);

			socket.emit("history", history);

			if (!isResync) {
				users = users.filter((u) => u.id !== socket.id);
				users.push({ id: socket.id, name, channel: safeChannel });

				await pushEvent(systemEvent(safeChannel, `👋 ${name} joined #${safeChannel}`));
				emitUsers(safeChannel);
			} else {
				const existing = users.find((u) => u.id === socket.id);
				if (!existing) {
					users.push({ id: socket.id, name, channel: safeChannel });
				} else {
					users = users.map((u) =>
						u.id === socket.id ? { ...u, name, channel: safeChannel } : u
					);
				}
				emitUsers(safeChannel);
			}
		});

		socket.on("switch_channel", async ({ channel: nextChannel, sinceTs }) => {
			const prev = socket.data.channel;
			const name = socket.data.name;

			if (!name) {
				socket.emit("error", "Not joined yet. Please join first.");
				return;
			}

			const safeNext: Channel = CHANNELS.includes(nextChannel) ? nextChannel : "general";
			if (prev === safeNext) return;

			// Leave previous room and announce leave there
			if (prev) {
				socket.leave(prev);

				// Update presence to new channel before emitting users list
				users = users.map((u) =>
					u.id === socket.id ? { ...u, channel: safeNext } : u
				);

				await pushEvent(systemEvent(prev, `🏃 ${name} left #${prev}`));
				emitUsers(prev);
			}

			// Join new room
			socket.join(safeNext);
			socket.data.channel = safeNext;

			// Send history for new channel (incremental if sinceTs provided)
			const history =
				typeof sinceTs === "number"
					? await getEventsSince(safeNext, sinceTs, HISTORY_LIMIT)
					: await getRecentEvents(safeNext, HISTORY_LIMIT);

			socket.emit("history", history);

			await pushEvent(systemEvent(safeNext, `👋 ${name} joined #${safeNext}`));
			emitUsers(safeNext);
		});

		socket.on("post_event", async (payload: PostEventPayload, ack) => {
			const name = socket.data.name;
			const activeChannel = socket.data.channel;

			// Validation moved to a dedicated module for unit testing
			const res = validatePostEvent({
				activeChannel,
				payload,
			});

			if (!res.ok) {
				ack({ ok: false, error: res.error });
				return;
			}

			// At this point activeChannel is defined and equals payload.channel
			const channel = activeChannel as Channel;

			const e: FeedEvent = {
				id: makeId(),
				ts: Date.now(),
				channel,
				type: payload.type,
				author: name ?? "",
				text: payload.text.trim(),
				system: false,
			};

			await pushEvent(e);
			ack({ ok: true, event: e });
		});

		socket.on("disconnect", async () => {
			const name = socket.data.name;
			const channel = socket.data.channel;

			// Remove from presence list
			users = users.filter((u) => u.id !== socket.id);

			if (channel && name) {
				await pushEvent(systemEvent(channel, `🏃 ${name} disconnected`));
				emitUsers(channel);
			}
		});
	});
}
