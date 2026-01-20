import type { Channel, PostEventPayload } from "../../types";

export function validatePostEvent(params: {
	activeChannel?: Channel;
	payload: PostEventPayload;
}):
	| { ok: true }
	| { ok: false; error: string } {
	const { activeChannel, payload } = params;

	if (!activeChannel) {
		return { ok: false, error: "Not joined yet." };
	}

	if (payload.channel !== activeChannel) {
		return { ok: false, error: "You can only post to your active channel." };
	}

	const text = (payload.text ?? "").trim();
	if (!text) return { ok: false, error: "Message cannot be empty." };
	if (text.length > 500) return { ok: false, error: "Message too long (max 500 chars)." };

	return { ok: true };
}
