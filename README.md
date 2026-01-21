# SayIt — Real-Time Event Feed Platform

SayIt is a real-time, channel-based event feed application built with SvelteKit, TypeScript, and Socket.IO.
It started as a simple chat application and was refactored into a structured, reliable real-time system with typed events, presence tracking, acknowledgements, and replayable history.

The project focuses on real-time systems engineering, not social chat features.

## Features

Real-time communication using Socket.IO

Channel-based routing (#general, #alerts, #incidents)

Typed event contracts shared between client and server

Event acknowledgements for reliable delivery

Presence tracking per channel

System-generated events (join/leave, disconnects)

Bounded event history per channel

Modern SvelteKit frontend with a performance-focused UI

#Why this project

This project was built to explore and demonstrate:

real-time client/server communication

event-driven system design

state synchronization across multiple clients

typed APIs and contracts in TypeScript

production-minded refactoring of an existing codebase

The architecture and concepts used here are applicable to:

collaboration tools

dashboards

monitoring systems

incident management platforms

live data feeds

## Tech Stack
Frontend: SvelteKit, TypeScript, Socket.IO client
Backend: Node.js, Express, Socket.IO server
Tooling: Vite, TypeScript (strict mode), ESLint (via SvelteKit defaults)

## Project Structure
src/

├── lib/

│   ├── server/

│   ├── Messages.svelte

│   ├── Send.svelte

│   └── Status.svelte

├── routes/

│   └── chat/

│       └── +page.svelte

├── types.ts          

server.ts

sockets.ts

## Running 
To run open:

https://rm9g5xbl-5173.euw.devtunnels.ms/


Open multiple browser tabs to see real-time synchronization.

## Event Model (simplified)

Each event is a typed object:

{
  id: string;
  ts: number;
  channel: "general" | "alerts" | "incidents";
  type: "MESSAGE_POSTED" | "ALERT_CREATED";
  author: string;
  text: string;
  system: boolean;
}


This makes the system extensible beyond chat messages.

## Roadmap

 Typed real-time event system

 Channel-based routing & presence

 SQLite persistence (Phase 2.1)

 Event replay on reconnect

 Tests for socket flows

 Basic observability (metrics/logs)

## License & Attribution

This project is based on the open-source repository
ScriptRaccoon/sveltekit-chat-app (MIT License) and has been significantly refactored and extended.
