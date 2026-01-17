import type { IncomingMessage, ServerResponse, Server } from "http";
import { Server as IoServer } from "socket.io";
import { insertEvent, getRecentEvents } from "./src/lib/server/db";


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
	const eventsByChannel: Record<Channel, FeedEvent[]> = {
		general: [],
		alerts: [],
		incidents: [],
	};

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
		socket.on("join", async ({ name, channel }) => {
			const safeChannel: Channel = CHANNELS.includes(channel) ? channel : "general";

			socket.data.name = name;
			socket.data.channel = safeChannel;

			socket.join(safeChannel);

			users.push({ id: socket.id, name, channel: safeChannel });

			socket.emit("history", await getRecentEvents(safeChannel));

			await pushEvent(systemEvent(safeChannel, `👋 ${name} joined #${safeChannel}`));
			emitUsers(safeChannel);
		});

		socket.on("switch_channel", async (nextChannel) => {
			const prev = socket.data.channel;
			const name = socket.data.name;

			if (!name) {
				socket.emit("error", "Not joined yet. Please join first.");
				return;
			}

			const safeNext: Channel = CHANNELS.includes(nextChannel) ? nextChannel : "general";
			if (prev === safeNext) return;

			if (prev) {
				socket.leave(prev);

				users = users.map((u) =>
					u.id === socket.id ? { ...u, channel: safeNext } : u
				);

				await pushEvent(systemEvent(prev, `🏃 ${name} left #${prev}`));
				emitUsers(prev);
			}

			socket.join(safeNext);
			socket.data.channel = safeNext;

			socket.emit("history", await getRecentEvents(safeNext));

			await pushEvent(systemEvent(safeNext, `👋 ${name} joined #${safeNext}`));
			emitUsers(safeNext);
		});

		socket.on("post_event", async (payload: PostEventPayload, ack) => {
			const name = socket.data.name;
			const channel = socket.data.channel;

			if (!name || !channel) {
				ack({ ok: false, error: "Not joined yet." });
				return;
			}

			if (payload.channel !== channel) {
				ack({ ok: false, error: "You can only post to your active channel." });
				return;
			}

			const text = (payload.text ?? "").trim();
			if (!text) {
				ack({ ok: false, error: "Message cannot be empty." });
				return;
			}
			if (text.length > 500) {
				ack({ ok: false, error: "Message too long (max 500 chars)." });
				return;
			}

			const e: FeedEvent = {
				id: makeId(),
				ts: Date.now(),
				channel,
				type: payload.type,
				author: name,
				text,
				system: false,
			};

			await pushEvent(e);
			ack({ ok: true, event: e });
		});

		socket.on("disconnect", async () => {
			const name = socket.data.name;
			const channel = socket.data.channel;

			users = users.filter((u) => u.id !== socket.id);

			if (channel && name) {
				await pushEvent(systemEvent(channel, `🏃 ${name} disconnected`));
				emitUsers(channel);
			}
		});
	});
}
