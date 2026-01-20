import sqlite3 from "sqlite3";
import { open, type Database } from "sqlite";
import type { Channel, FeedEvent } from "../../types";

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function getDb() {
	if (db) return db;

	db = await open({
		filename: process.env.DB_FILE ?? "data.sqlite",
		driver: sqlite3.Database
	});

	await db.exec(`
		CREATE TABLE IF NOT EXISTS events (
			id TEXT PRIMARY KEY,
			ts INTEGER NOT NULL,
			channel TEXT NOT NULL,
			type TEXT NOT NULL,
			author TEXT NOT NULL,
			text TEXT NOT NULL,
			system INTEGER NOT NULL
		);

		CREATE INDEX IF NOT EXISTS idx_events_channel_ts
		ON events(channel, ts);
	`);

	return db;
}

export async function insertEvent(e: FeedEvent) {
	const d = await getDb();
	await d.run(
		`INSERT INTO events (id, ts, channel, type, author, text, system)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		e.id,
		e.ts,
		e.channel,
		e.type,
		e.author,
		e.text,
		e.system ? 1 : 0
	);
}

export async function getRecentEvents(
	channel: Channel,
	limit = 50
): Promise<FeedEvent[]> {
	const d = await getDb();
	const rows = await d.all<any[]>(
		`SELECT id, ts, channel, type, author, text, system
		 FROM events
		 WHERE channel = ?
		 ORDER BY ts DESC
		 LIMIT ?`,
		channel,
		limit
	);

	return rows.reverse().map((r) => ({
		id: r.id,
		ts: r.ts,
		channel: r.channel,
		type: r.type,
		author: r.author,
		text: r.text,
		system: Boolean(r.system),
	}));
}

export async function getEventsSince(
	channel: Channel,
	sinceTs: number,
	limit = 200
): Promise<FeedEvent[]> {
	const d = await getDb();
	const rows = await d.all<any[]>(
		`SELECT id, ts, channel, type, author, text, system
		 FROM events
		 WHERE channel = ? AND ts > ?
		 ORDER BY ts ASC
		 LIMIT ?`,
		channel,
		sinceTs,
		limit
	);

	return rows.map((r) => ({
		id: r.id,
		ts: r.ts,
		channel: r.channel,
		type: r.type,
		author: r.author,
		text: r.text,
		system: Boolean(r.system),
	}));
}
