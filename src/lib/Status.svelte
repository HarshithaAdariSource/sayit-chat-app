<script lang="ts">
	import { fade } from "svelte/transition";
	import { flip } from "svelte/animate";
	import { name } from "$/stores";
	import type { UserPresence, Channel } from "$/types";

	export let users: UserPresence[] = [];
	export let channel: Channel;
	export let onSwitch: (c: Channel) => void;

	const channels: Channel[] = ["general", "alerts", "incidents"];
</script>

<aside>
	<div class="left">
		<div class="channels">
			<span>Channels:</span>
			{#each channels as c}
				<button class:active={c === channel} type="button" on:click={() => onSwitch(c)}>
					#{c}
				</button>
			{/each}
		</div>

		<ul>
			<span>Users in #{channel}:</span>
			{#each users as user (user.id)}
				<li animate:flip transition:fade>{user.name}</li>
			{/each}
		</ul>
	</div>

	<p class="right">
		You are logged in as
		<b>{$name} &ndash; <a href="/" data-sveltekit-reload>Logout</a></b>
	</p>
</aside>

<style>
	aside {
		padding: 0.5rem;
		color: var(--dark-font-color);
		font-size: smaller;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.left {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.channels {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	button {
		background: var(--bg-color-2);
		border: 1px solid transparent;
		padding: 0.2rem 0.5rem;
		border-radius: 0.4rem;
		cursor: pointer;
	}

	.active {
		border-color: var(--dark-font-color);
		font-weight: 700;
	}

	ul {
		list-style-type: none;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	li {
		background-color: var(--bg-color-2);
		padding: 0.2rem 0.4rem;
		border-radius: 0.2rem;
	}

	.right {
		margin: 0;
	}

	@media (min-width: 420px) {
		aside {
			flex-direction: row;
			justify-content: space-between;
			align-items: flex-start;
		}
	}
</style>
