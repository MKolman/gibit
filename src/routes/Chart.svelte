<script context="module" lang="ts">
	import { OhlcElement, OhlcController, CandlestickElement, CandlestickController } from 'chartjs-chart-financial'
	import Chart from 'chart.js/auto';
	import { type ChartConfiguration as Config } from 'chart.js';
	Chart.register(OhlcElement, OhlcController, CandlestickElement, CandlestickController)

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

<canvas use:handleChart={config}></canvas>

<style>
	canvas {
		width: 100%!important;
		min-height: 500px;
	}
</style>