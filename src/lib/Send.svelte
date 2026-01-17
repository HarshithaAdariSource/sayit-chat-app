<script lang="ts">
	export let text = "";
	export let kind: "MESSAGE_POSTED" | "ALERT_CREATED" = "MESSAGE_POSTED";
	export let send_event = () => {};
</script>

<form on:submit|preventDefault={send_event}>
	<select aria-label="event type" bind:value={kind}>
		<option value="MESSAGE_POSTED">Message</option>
		<option value="ALERT_CREATED">Alert</option>
	</select>

	<input aria-label="text" type="text" bind:value={text} placeholder="Write an update…" />

	<button>Send</button>
</form>

<style>
	form {
		padding: 1rem;
		background-color: var(--bg-color-2);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	select, input {
		flex-grow: 1;
	}

	@media (min-width: 420px) {
		form {
			flex-direction: row;
		}
	}
</style>
