<script lang="ts">
    import { tooltip } from '@svelte-plugins/tooltips';
    export let message: string;
</script>
<button
    title={message}
    use:tooltip={{
        action: "click",
        position: "right",
        arrow: true,
        hideOnClickOutside: true,
        autoPosition: true
    }}
>
    <span>?</span>
</button>
<style>
    button {
        position: relative;
        display: inline-flex;
        align-items: center;
        flex-direction: column;
        color: white;
        background-color: black;
        border-radius: 1000em;
        width: 0.8em;
        height: 0.8em;
        font-size: inherit;
        vertical-align: middle;
        border: none;
        line-height: 0.75em;
    }
    button > span {
        font-size: 0.7em;
    }
</style>