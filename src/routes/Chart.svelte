<script context="module" lang="ts">
	import Chart from 'chart.js/auto';
	import { type ChartConfiguration as Config } from 'chart.js';
</script>

<script lang="ts">
	export let config: Config;
	
	const handleChart = (element: HTMLCanvasElement, config: Config) => {
		let theChart = new Chart(element, config)
		return {
			update(config: Config) {
				theChart.destroy()
				theChart = new Chart(element, config)
			},
			destroy() {
				theChart.destroy()
			}
		}
	}
</script>

<canvas use:handleChart={config} style="width: 100px; height: 100px;"></canvas>