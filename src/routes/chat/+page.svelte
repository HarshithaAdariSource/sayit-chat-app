<script lang="ts">
	import { io, Socket } from "socket.io-client";
	import { browser } from "$app/environment";
	import { goto } from "$app/navigation";
	import Status from "$lib/Status.svelte";
	import Messages from "$lib/Messages.svelte";
	import SendForm from "$lib/Send.svelte";
	import { name } from "$/stores";
	import { tick } from "svelte";

	import type {
		FeedEvent,
		UserPresence,
		ServerToClientEvents,
		ClientToServerEvents,
		Channel,
		PostAck
	} from "$/types";

	let events: FeedEvent[] = [];
	let messages_element: HTMLElement;
	let users: UserPresence[] = [];

	let channel: Channel = "general";
	let text = "";
	let kind: "MESSAGE_POSTED" | "ALERT_CREATED" = "MESSAGE_POSTED";

	let lastError = "";
	let socket: Socket<ServerToClientEvents, ClientToServerEvents> | undefined;
	let lastSeenTs: Record<string, number> = {};

	if (browser && !$name) {
		goto("/");
	} else {
		setup_socket();
	}

	function setup_socket() {
		socket = io();

		// after socket = io();
		(window as any).__socket = socket;

		socket.on("history", async (history) => {
			events = history;
			
			if (history.length > 0) {
				lastSeenTs[channel] = history[history.length - 1].ts;
			}
			await scroll_to_bottom();
		});

		socket.on("event", async (e) => {
			events = [...events, e];
			if (e.channel === channel) {
				lastSeenTs[channel] = e.ts;
			}
		    await scroll_to_bottom();
		});

		socket.on("users", (_users) => {
			users = _users;
		});

		socket.on("error", (msg) => {
			lastError = msg;
		});

		socket.emit("join", { name: $name, channel, sinceTs: lastSeenTs[channel] });
		socket.on("connect", () => {
			socket?.emit("join", { name: $name, channel, sinceTs: lastSeenTs[channel] });
		});
	}

	function switchChannel(next: Channel) {
		channel = next;
		lastError = "";
		socket?.emit("switch_channel", { channel: next, sinceTs: lastSeenTs[next] });
	}

	function send_event() {
		lastError = "";
		const payload = { channel, type: kind, text };

		socket?.emit("post_event", payload, (res: PostAck) => {
			if (!res.ok) {
				lastError = res.error;
			} else {
				// event already broadcast back; clear input
				text = "";
			}
		});
	}

	async function scroll_to_bottom() {
		await tick();
		if (messages_element) {
			messages_element.scrollTop = messages_element.scrollHeight;
		}
	}
</script>

{#if $name}
	<Status {users} {channel} onSwitch={switchChannel} />

	{#if lastError}
		<p class="error">{lastError}</p>
	{/if}

	<Messages bind:events bind:messages_element />

	<SendForm bind:text bind:kind {send_event} />
{:else}
	<p>You are not logged in.</p>
{/if}

<style>
	p {
		text-align: center;
		padding-block: 1rem;
	}
	.error {
		margin: 0.5rem 1rem;
		padding: 0.5rem;
		border: 1px solid #ff7a7a;
		border-radius: 6px;
		text-align: left;
	}
</style>
