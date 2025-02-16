<script lang="ts">
    export let value: boolean;
    export let labels: [string, string];
</script>
<label>
    {labels[0]}
    <input type="checkbox" bind:checked={value} />
    <span class="toggle"></span>
    {labels[1]}
</label>
<style>
    input {
        display: none;
    }
    .toggle {
        display: inline-block;
        width: 2em;
        height: 1em;
        border-radius: 5px;
        border: 1px solid #1c93d1;
    }
    .toggle:before {
        content: "";
        display: block;
        width: 1em;
        height: 1em;
        background: #1c93d1;
        border-radius: 4px;
        transition: 0.3s;
    }
    input:checked + .toggle:before {
        background: #6cac44;
        transform: translateX(1em);
    }
</style>