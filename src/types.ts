export type Channel = "general" | "alerts" | "incidents";

export type EventType =
	| "MESSAGE_POSTED"
	| "ALERT_CREATED"
	| "USER_JOINED"
	| "USER_LEFT";

export type FeedEvent = {
	id: string;
	ts: number;
	channel: Channel;
	type: EventType;
	author: string;
	text: string;
	system?: boolean;
};

export type UserPresence = {
	id: string; 
	name: string;
	channel: Channel;
};

export type JoinPayload = {
	name: string;
	channel: Channel;
};

export type PostEventPayload = {
	channel: Channel;
	type: "MESSAGE_POSTED" | "ALERT_CREATED";
	text: string;
};

export type PostAck =
	| { ok: true; event: FeedEvent }
	| { ok: false; error: string };

export type ServerToClientEvents = {
	event: (e: FeedEvent) => void;

	history: (events: FeedEvent[]) => void;

	users: (users: UserPresence[]) => void;

	error: (msg: string) => void;
};

export type ClientToServerEvents = {
	join: (p: JoinPayload) => void;
	switch_channel: (channel: Channel) => void;

	post_event: (p: PostEventPayload, ack: (res: PostAck) => void) => void;
};

export type InterServerEvents = {};

export type SocketData = {
	name?: string;
	channel?: Channel;
};
