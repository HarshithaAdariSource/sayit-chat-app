import { describe, it, expect } from "vitest";
import { validatePostEvent } from "../validation";

describe("validatePostEvent", () => {
	it("rejects when not joined", () => {
		const res = validatePostEvent({
			activeChannel: undefined,
			payload: { channel: "general", type: "MESSAGE_POSTED", text: "hi" }
		});
		expect(res.ok).toBe(false);
		if (!res.ok) expect(res.error).toBe("Not joined yet.");
	});

	it("rejects posting to non-active channel", () => {
		const res = validatePostEvent({
			activeChannel: "general",
			payload: { channel: "alerts", type: "MESSAGE_POSTED", text: "hi" }
		});
		expect(res.ok).toBe(false);
		if (!res.ok) expect(res.error).toMatch("active channel");
	});

	it("rejects empty messages", () => {
		const res = validatePostEvent({
			activeChannel: "general",
			payload: { channel: "general", type: "MESSAGE_POSTED", text: "   " }
		});
		expect(res.ok).toBe(false);
		if (!res.ok) expect(res.error).toBe("Message cannot be empty.");
	});

	it("rejects >500 chars", () => {
		const res = validatePostEvent({
			activeChannel: "general",
			payload: { channel: "general", type: "MESSAGE_POSTED", text: "a".repeat(501) }
		});
		expect(res.ok).toBe(false);
		if (!res.ok) expect(res.error).toMatch("max 500");
	});

	it("accepts valid payload", () => {
		const res = validatePostEvent({
			activeChannel: "general",
			payload: { channel: "general", type: "MESSAGE_POSTED", text: "hello" }
		});
		expect(res.ok).toBe(true);
	});
});
