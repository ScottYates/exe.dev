<script lang="ts">
	import { getFeed, refreshFeed, submitFeed } from '$lib/api/client.js';
	import { formatDate, stripHtml, truncateText, escapeHtml } from '$lib/utils.js';
	import type { FeedItem } from '$lib/api/types.js';

	let {
		widgetId,
		feedUrl,
		showPreview = true,
		maxItems = 0,
		visitedLinks,
		proxyUrl,
		proxyUser,
		proxyPass,
		onMarkVisited
	}: {
		widgetId: string;
		feedUrl: string;
		showPreview?: boolean;
		maxItems?: number;
		visitedLinks: Set<string>;
		proxyUrl?: string;
		proxyUser?: string;
		proxyPass?: string;
		onMarkVisited: (url: string) => void;
	} = $props();

	let items = $state<FeedItem[]>([]);
	let loading = $state(true);
	let error = $state('');
	let retryTimeout: ReturnType<typeof setTimeout> | null = null;
	let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

	async function fetchFeedFromClient(url: string): Promise<FeedItem[]> {
		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const xmlText = await response.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(xmlText, 'text/xml');

			const parserError = doc.querySelector('parsererror');
			if (parserError) {
				throw new Error('XML parsing failed');
			}

			const parsedItems: FeedItem[] = [];

			// Try RSS format first (channel > item)
			const rssItems = doc.querySelectorAll('channel > item');
			if (rssItems.length > 0) {
				rssItems.forEach((item) => {
					const title = item.querySelector('title')?.textContent || 'Untitled';
					const link = item.querySelector('link')?.textContent || '';
					const descriptionRaw = item.querySelector('description')?.textContent || '';
					const description = truncateText(stripHtml(descriptionRaw), 300);
					const pubDate = item.querySelector('pubDate')?.textContent || '';
					const author = item.querySelector('author')?.textContent || item.querySelector('dc\\:creator, creator')?.textContent || '';

					parsedItems.push({
						title,
						link,
						description,
						published: pubDate,
						author
					});
				});
			} else {
				// Try Atom format (feed > entry)
				const atomEntries = doc.querySelectorAll('feed > entry');
				atomEntries.forEach((entry) => {
					const title = entry.querySelector('title')?.textContent || 'Untitled';
					const linkEl = entry.querySelector('link[href]');
					const link = linkEl?.getAttribute('href') || '';
					const summaryRaw = entry.querySelector('summary')?.textContent || entry.querySelector('content')?.textContent || '';
					const description = truncateText(stripHtml(summaryRaw), 300);
					const published = entry.querySelector('published')?.textContent || entry.querySelector('updated')?.textContent || '';
					const author = entry.querySelector('author > name')?.textContent || '';

					parsedItems.push({
						title,
						link,
						description,
						published,
						author
					});
				});
			}

			if (parsedItems.length > 0) {
				// Submit parsed feed to server
				await submitFeed(url, parsedItems, proxyUrl, proxyUser, proxyPass);
			}

			return parsedItems;
		} catch (err) {
			console.error('Client-side feed fetch failed:', err);
			return [];
		}
	}

	async function loadFeed(isRetry = false) {
		if (!feedUrl) {
			loading = false;
			return;
		}

		loading = true;
		error = '';

		// Set 3-second timeout to trigger refresh if still loading
		if (!isRetry && refreshTimeout) {
			clearTimeout(refreshTimeout);
		}
		if (!isRetry) {
			refreshTimeout = setTimeout(async () => {
				if (loading) {
					try {
						await refreshFeed(feedUrl, proxyUrl, proxyUser, proxyPass);
						await loadFeed(true);
					} catch (err) {
						console.error('Refresh feed failed:', err);
					}
				}
			}, 3000);
		}

		try {
			const response = await getFeed(feedUrl, proxyUrl, proxyUser, proxyPass);

			// Clear refresh timeout if feed loaded
			if (refreshTimeout) {
				clearTimeout(refreshTimeout);
				refreshTimeout = null;
			}

			// Check if we need to fetch from client
			if (response.client_fetch_url && (!response.items || response.items.length === 0)) {
				const clientItems = await fetchFeedFromClient(response.client_fetch_url);
				if (clientItems.length > 0) {
					items = clientItems;
					loading = false;
					return;
				}
			}

			// Check if feed is pending or has no items - retry
			if (response.pending || !response.items || response.items.length === 0) {
				if (retryTimeout) {
					clearTimeout(retryTimeout);
				}
				retryTimeout = setTimeout(() => {
					loadFeed(true);
				}, 2000 + Math.random() * 1000); // 2-3 seconds
				return;
			}

			// Success - render items
			items = response.items || [];
			loading = false;
		} catch (err) {
			console.error('Load feed failed:', err);
			error = err instanceof Error ? err.message : 'Failed to load feed';
			loading = false;

			// Clear timeouts on error
			if (refreshTimeout) {
				clearTimeout(refreshTimeout);
				refreshTimeout = null;
			}
			if (retryTimeout) {
				clearTimeout(retryTimeout);
				retryTimeout = null;
			}
		}
	}

	function handleLinkClick(event: MouseEvent, url: string) {
		// Only handle primary (0) and middle (1) mouse buttons
		if (event.button !== 0 && event.button !== 1) {
			return;
		}

		const target = event.currentTarget as HTMLElement;
		const feedItem = target.closest('.feed-item') as HTMLElement;

		if (feedItem) {
			feedItem.classList.add('visited');
		}

		onMarkVisited(url);
	}

	$effect(() => {
		// Trigger loading when feedUrl changes
		feedUrl;
		
		// Clear any existing timeouts
		if (refreshTimeout) {
			clearTimeout(refreshTimeout);
			refreshTimeout = null;
		}
		if (retryTimeout) {
			clearTimeout(retryTimeout);
			retryTimeout = null;
		}

		loadFeed();

		// Cleanup on unmount
		return () => {
			if (refreshTimeout) clearTimeout(refreshTimeout);
			if (retryTimeout) clearTimeout(retryTimeout);
		};
	});

	const displayItems = $derived(maxItems > 0 ? items.slice(0, maxItems) : items);
</script>

<div class="rss-feed">
	{#if loading}
		<div class="feed-loading">
			<div class="spinner"></div>
			<span>Loading feed...</span>
		</div>
	{:else if error}
		<div class="feed-error">
			<span>Error: {error}</span>
		</div>
	{:else if displayItems.length === 0}
		<div class="feed-empty">
			<span>No items found</span>
		</div>
	{:else}
		<div class="feed-items">
			{#each displayItems as item (item.link)}
				<div
					class="feed-item"
					class:compact={!showPreview}
					class:visited={visitedLinks.has(item.link)}
					data-link={item.link}
				>
					<div class="feed-item-title">
						<a
							href={item.link}
							target="_blank"
							rel="noopener noreferrer"
							onmousedown={(e) => handleLinkClick(e, item.link)}
						>
							{item.title}
						</a>
					</div>
					{#if item.published}
						<div class="feed-item-meta">
							{formatDate(item.published)}
						</div>
					{/if}
					{#if showPreview && item.description}
						<div class="feed-item-description">
							{item.description}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.rss-feed {
		width: 100%;
		height: 100%;
		overflow-y: auto;
	}

	.feed-loading,
	.feed-error,
	.feed-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		gap: 0.5rem;
	}

	.spinner {
		width: 1.5rem;
		height: 1.5rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: currentColor;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.feed-items {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 0.5rem;
	}

	.feed-item {
		padding: 0.75rem;
		border-radius: 0.375rem;
		background: rgba(255, 255, 255, 0.05);
		transition: background 0.2s;
	}

	.feed-item:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.feed-item.compact {
		padding: 0.5rem 0.75rem;
	}

	.feed-item.visited {
		opacity: 0.6;
	}

	.feed-item-title {
		font-weight: 500;
		margin-bottom: 0.25rem;
	}

	.feed-item-title a {
		color: inherit;
		text-decoration: none;
	}

	.feed-item-title a:hover {
		text-decoration: underline;
	}

	.feed-item-meta {
		font-size: 0.75rem;
		opacity: 0.7;
		margin-bottom: 0.5rem;
	}

	.feed-item-description {
		font-size: 0.875rem;
		opacity: 0.85;
		line-height: 1.4;
	}

	.feed-error {
		color: #ff6b6b;
	}

	.feed-empty {
		opacity: 0.6;
	}
</style>
