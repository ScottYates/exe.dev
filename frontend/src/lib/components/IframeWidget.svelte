<script lang="ts">
	import type { WidgetConfig } from '$lib/api/types.js';

	let { config, widgetId }: { config: WidgetConfig; widgetId: string } = $props();

	let proxyUrl = $derived(() => {
		if (!config.iframe_url) return '';
		let url = `/api/proxy?url=${encodeURIComponent(config.iframe_url)}`;
		if (config.iframe_css) {
			url += `&css=${encodeURIComponent(config.iframe_css)}`;
		}
		return url;
	});

	let hideScrollbars = $derived(config.hide_scrollbars ? 'hide-scrollbars' : '');
	let offsetX = $derived(config.offset_x || 0);
	let offsetY = $derived(config.offset_y || 0);
	let extraSize = $derived(config.hide_scrollbars ? 20 : 0);
</script>

{#if config.iframe_url}
	<div class="iframe-container {hideScrollbars}">
		<iframe
			src={proxyUrl()}
			sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation"
			style="left: {offsetX}px; top: {offsetY}px; width: calc(100% + {extraSize}px - {offsetX}px); height: calc(100% + {extraSize}px - {offsetY}px);"
			loading="lazy"
			title="{config.iframe_url}"
		></iframe>
	</div>
{:else}
	<div class="feed-empty">No URL configured. Click ⚙️ to add one.</div>
{/if}
