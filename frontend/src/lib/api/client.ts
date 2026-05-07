import type { ApiResponse, Widget, FeedData, AuthStatus, SlugCheck } from './types.js';

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
	try {
		const resp = await fetch(url, options);
		const data = await resp.json();
		return data;
	} catch (e) {
		console.error('API request failed:', url, e);
		return { success: false, error: String(e) };
	}
}

function json(body: unknown): RequestInit {
	return {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	};
}

function patch(body: unknown): RequestInit {
	return {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	};
}

// Auth
export const getAuthStatus = () => request<AuthStatus>('/api/auth/status');

// Widgets
export const getWidgets = (pageId: string) =>
	request<Widget[]>(`/api/pages/${pageId}/widgets`);

export const createWidget = (pageId: string, data: Partial<Widget>) =>
	request<Widget>(`/api/pages/${pageId}/widgets`, json(data));

export const updateWidget = (widgetId: string, data: Partial<Widget> & { config?: string }) =>
	request<Widget>(`/api/widgets/${widgetId}`, patch(data));

export const deleteWidget = (widgetId: string) =>
	request<void>(`/api/widgets/${widgetId}`, { method: 'DELETE' });

export const importWidgets = (pageId: string, data: { widgets: unknown[]; page_settings?: unknown }) =>
	request<{ widgets: Widget[] }>(`/api/pages/${pageId}/import`, json(data));

// Pages
export const updatePage = (pageId: string, data: Record<string, unknown>) =>
	request<{ id: string; slug?: string }>(`/api/pages/${pageId}`, patch(data));

export const checkSlug = (pageId: string, slug: string) =>
	request<SlugCheck>(`/api/pages/${pageId}/check-slug?slug=${encodeURIComponent(slug)}`);

// Feeds
export function getFeed(feedUrl: string, proxyUrl?: string, proxyUser?: string, proxyPass?: string) {
	let url = `/api/feed?url=${encodeURIComponent(feedUrl)}`;
	if (proxyUrl) {
		url += `&proxy=${encodeURIComponent(proxyUrl)}`;
		if (proxyUser) {
			url += `&proxy_user=${encodeURIComponent(proxyUser)}`;
			if (proxyPass) url += `&proxy_pass=${encodeURIComponent(proxyPass)}`;
		}
	}
	return request<FeedData>(url);
}

export function refreshFeed(feedUrl: string, proxyUrl?: string, proxyUser?: string, proxyPass?: string) {
	let url = `/api/feed/refresh?url=${encodeURIComponent(feedUrl)}`;
	if (proxyUrl) {
		url += `&proxy=${encodeURIComponent(proxyUrl)}`;
		if (proxyUser) {
			url += `&proxy_user=${encodeURIComponent(proxyUser)}`;
			if (proxyPass) url += `&proxy_pass=${encodeURIComponent(proxyPass)}`;
		}
	}
	return request<void>(url, { method: 'POST' });
}

export const submitFeed = (feedUrl: string, title: string, items: unknown[]) =>
	request<void>('/api/feed/submit', json({ url: feedUrl, title, items }));

// Favicon
export const getFaviconUrl = (url: string) =>
	`/api/favicon?url=${encodeURIComponent(url)}`;

// Visited links
export const getVisitedLinks = () => request<string[]>('/api/visited');

export const markVisited = (url: string) =>
	request<void>('/api/visited', json({ url }));

export const unmarkVisited = (urls: string[]) =>
	request<void>('/api/visited', {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ urls })
	});
