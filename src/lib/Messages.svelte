<script lang="ts">
	import type { FeedEvent } from "$/types";
	export let events: FeedEvent[] = [];
	export let messages_element: HTMLElement;

	function fmt(ts: number) {
		const d = new Date(ts);
		return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
	}
</script>

<section bind:this={messages_element}>
	<ol>
		{#each events as e (e.id)}
			<li class:system={e.system} class:alert={e.type === "ALERT_CREATED"}>
				<span class="ts">{fmt(e.ts)}</span>
				<span class="meta">
					{#if e.system}
						<span class="channel">#{e.channel}</span>
					{:else}
						<span class="author">{e.author}</span>
						<span class="channel">#{e.channel}</span>
						<span class="type">{e.type}</span>
					{/if}
				</span>
				<span class="text">{e.text}</span>
			</li>
		{/each}
	</ol>
</section>

<style>
	section {
		padding: 0.5rem;
		overflow-y: scroll;
		scroll-behavior: smooth;
	}

	ol {
		list-style-type: none;
	}

	li {
		margin-bottom: 0.5rem;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.5rem;
		align-items: baseline;
	}

	.ts {
		font-size: 0.8rem;
		opacity: 0.7;
		min-width: 6.5rem;
	}

	.meta {
		display: inline-flex;
		gap: 0.5rem;
		align-items: baseline;
		flex-wrap: wrap;
	}

	.author {
		font-weight: 600;
	}

	.channel, .type {
		font-size: 0.8rem;
		opacity: 0.75;
		padding: 0.05rem 0.35rem;
		border-radius: 0.35rem;
		background: var(--bg-color-2);
	}

	.text {
		grid-column: 2;
	}

	.system {
		font-weight: 600;
	}

	.alert .text {
		font-weight: 700;
	}
</style>
