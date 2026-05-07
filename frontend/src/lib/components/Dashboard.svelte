<script lang="ts">
	import {
		getAuthStatus,
		getWidgets,
		createWidget,
		updateWidget,
		deleteWidget as apiDeleteWidget,
		getVisitedLinks,
		markVisited,
		unmarkVisited,
		updatePage,
		importWidgets as apiImportWidgets,
		refreshFeed
	} from '$lib/api/client.js';
	import type { Widget, PageConfig, AuthStatus, WidgetConfig } from '$lib/api/types.js';
	import { DEFAULT_PAGE_CONFIG } from '$lib/api/types.js';
	import { parseWidgetConfig } from '$lib/utils.js';
	import WidgetComponent from './Widget.svelte';
	import Navbar from './Navbar.svelte';
	import SettingsModal from './SettingsModal.svelte';
	import WidgetModal from './WidgetModal.svelte';
	import HtmlEditorModal from './HtmlEditorModal.svelte';
	import HelpOverlay from './HelpOverlay.svelte';

	// Page data passed from the route
	let {
		pageId,
		pageName: initialName,
		bgColor: initialBgColor,
		bgImage: initialBgImage,
		pageConfig: initialConfigStr,
		isOwner,
		isPublic: initialIsPublic,
		slug: initialSlug,
		slugAccess: initialSlugAccess
	}: {
		pageId: string;
		pageName: string;
		bgColor: string;
		bgImage: string;
		pageConfig: string;
		isOwner: boolean;
		isPublic: boolean;
		slug: string;
		slugAccess: boolean;
	} = $props();

	// Core state
	let auth = $state<AuthStatus>({ authenticated: false, oauth_enabled: false });
	let widgets = $state<Map<string, Widget>>(new Map());
	let visitedLinks = $state<Set<string>>(new Set());
	let pageName = $state(initialName);
	let bgColor = $state(initialBgColor);
	let bgImage = $state(initialBgImage);
	let pageConfig = $state<PageConfig>({ ...DEFAULT_PAGE_CONFIG });
	let slug = $state(initialSlug || '');
	let isPublic = $state(initialIsPublic);
	let slugAccess = $state(initialSlugAccess);

	// UI state
	let showSettings = $state(false);
	let showWidgetSettings = $state(false);
	let showHtmlEditorModal = $state(false);
	let showHelp = $state(false);
	let toolbarCollapsed = $state(false);
	let editingWidgetId = $state<string | null>(null);
	let autoRefreshTimer = $state<ReturnType<typeof setInterval> | null>(null);

	// For keyboard shortcut tracking
	let activeWidgetId = $state<string | null>(null);
	let mouseDown = $state(false);

	// Derived
	let widgetList = $derived(Array.from(widgets.values()));
	let editingWidget = $derived(editingWidgetId ? widgets.get(editingWidgetId) || null : null);

	// Parse initial config
	$effect(() => {
		try {
			const cfg = JSON.parse(initialConfigStr || '{}');
			pageConfig = { ...DEFAULT_PAGE_CONFIG, ...cfg };
			toolbarCollapsed = cfg.toolbar_collapsed || false;
		} catch {
			pageConfig = { ...DEFAULT_PAGE_CONFIG };
		}
	});

	// Apply CSS custom properties for header size, padding, brightness
	$effect(() => {
		const sizes = { compact: '32px', normal: '44px', large: '56px' };
		const paddings = { tight: '1px', compact: '4px', normal: '8px', spacious: '12px' };
		const brightness = { dim: '0.6', soft: '0.75', normal: '0.9', bright: '1.0' };
		document.documentElement.style.setProperty('--header-size', sizes[pageConfig.header_size] || '44px');
		document.documentElement.style.setProperty('--item-padding', paddings[pageConfig.item_padding] || '8px');
		document.documentElement.style.setProperty('--text-brightness', brightness[pageConfig.text_brightness] || '0.9');
	});

	// Auto-refresh
	$effect(() => {
		if (autoRefreshTimer) clearInterval(autoRefreshTimer);
		if (pageConfig.auto_refresh > 0) {
			autoRefreshTimer = setInterval(() => {
				window.location.reload();
			}, pageConfig.auto_refresh * 60 * 1000);
		}
		return () => {
			if (autoRefreshTimer) clearInterval(autoRefreshTimer);
		};
	});

	// Init
	$effect(() => {
		loadInitialData();
	});

	async function loadInitialData() {
		const [authRes, widgetsRes, visitedRes] = await Promise.all([
			getAuthStatus(),
			getWidgets(pageId),
			getVisitedLinks()
		]);

		if (authRes.success && authRes.data) auth = authRes.data;
		if (widgetsRes.success && widgetsRes.data) {
			const map = new Map<string, Widget>();
			for (const w of widgetsRes.data) map.set(w.id, w);
			widgets = map;
		}
		if (visitedRes.success && visitedRes.data) {
			visitedLinks = new Set(visitedRes.data);
		}
	}

	// --- Visited links ---
	function handleMarkVisited(url: string) {
		if (!visitedLinks.has(url)) {
			visitedLinks = new Set([...visitedLinks, url]);
			markVisited(url).catch((e) => console.error('Failed to mark visited:', e));
		}
	}

	// --- iframe message handling ---
	$effect(() => {
		function onMessage(e: MessageEvent) {
			if (e.data?.type === 'nfn-get-visited') {
				(e.source as Window)?.postMessage(
					{ type: 'nfn-visited', urls: [...visitedLinks] },
					'*'
				);
			} else if (e.data?.type === 'nfn-link-clicked') {
				handleMarkVisited(e.data.url);
			}
		}
		window.addEventListener('message', onMessage);
		return () => window.removeEventListener('message', onMessage);
	});

	// --- Keyboard shortcuts ---
	$effect(() => {
		function onMouseDown(e: MouseEvent) {
			mouseDown = true;
			const w = (e.target as HTMLElement).closest('.widget');
			if (w) activeWidgetId = w.id.replace('widget-', '');
		}
		function onMouseUp() {
			mouseDown = false;
		}
		function onKeyDown(e: KeyboardEvent) {
			const tag = (e.target as HTMLElement).tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
				if (e.key === 'Escape') { hideAllModals(); return; }
				if (e.key === 'Enter' && tag !== 'TEXTAREA') {
					const modal = (e.target as HTMLElement).closest('.modal');
					if (modal && !modal.id?.includes('html-editor')) {
						const btn = modal.querySelector('.btn-primary') as HTMLButtonElement;
						if (btn) { e.preventDefault(); btn.click(); }
					}
				}
				return;
			}
			if (e.key.toLowerCase() === 'x' && mouseDown && activeWidgetId) {
				e.preventDefault();
				markAllAsRead(activeWidgetId);
			}
			if (e.key.toLowerCase() === 'z' && mouseDown && activeWidgetId) {
				e.preventDefault();
				markAllAsUnread(activeWidgetId);
			}
			if (e.key === '?' || (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.metaKey)) {
				e.preventDefault();
				showHelp = !showHelp;
			}
			if (e.key === 'Escape') hideAllModals();
			if (e.key === 'Enter') {
				const modal = document.querySelector('.modal:not(.hidden)');
				if (modal && !modal.id?.includes('html-editor')) {
					const btn = modal.querySelector('.btn-primary') as HTMLButtonElement;
					if (btn) { e.preventDefault(); btn.click(); }
				}
			}
		}
		document.addEventListener('mousedown', onMouseDown);
		document.addEventListener('mouseup', onMouseUp);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('mousedown', onMouseDown);
			document.removeEventListener('mouseup', onMouseUp);
			document.removeEventListener('keydown', onKeyDown);
		};
	});

	// --- Mark all read/unread ---
	async function markAllAsRead(widgetId: string) {
		const widget = widgets.get(widgetId);
		if (!widget) return;
		const el = document.getElementById(`widget-${widgetId}`);
		if (!el) return;

		const urls: string[] = [];
		if (widget.widget_type === 'iframe') {
			const iframe = el.querySelector('iframe') as HTMLIFrameElement | null;
			if (iframe?.contentDocument) {
				try {
					iframe.contentDocument.querySelectorAll('a[href]').forEach((a) => {
						const href = (a as HTMLAnchorElement).href;
						if (href && !visitedLinks.has(href)) urls.push(href);
					});
				} catch (e) {
					console.warn('Cannot access iframe:', e);
				}
			}
		} else {
			el.querySelectorAll('.feed-item').forEach((item) => {
				const url = (item as HTMLElement).dataset.link;
				if (url && !visitedLinks.has(url)) {
					urls.push(url);
					item.classList.add('visited');
				}
			});
		}

		const newVisited = new Set(visitedLinks);
		for (const u of urls) newVisited.add(u);
		visitedLinks = newVisited;
		for (const u of urls) {
			await markVisited(u).catch(() => {});
		}
	}

	async function markAllAsUnread(widgetId: string) {
		const widget = widgets.get(widgetId);
		if (!widget || widget.widget_type === 'html') return;
		const el = document.getElementById(`widget-${widgetId}`);
		if (!el) return;

		const urls: string[] = [];
		if (widget.widget_type === 'iframe') {
			const iframe = el.querySelector('iframe') as HTMLIFrameElement | null;
			if (iframe?.contentDocument) {
				try {
					iframe.contentDocument.querySelectorAll('a[href]').forEach((a) => {
						const href = (a as HTMLAnchorElement).href;
						if (href && visitedLinks.has(href)) urls.push(href);
					});
				} catch (e) {
					console.warn('Cannot access iframe:', e);
				}
			}
		} else {
			el.querySelectorAll('.feed-item.visited').forEach((item) => {
				const url = (item as HTMLElement).dataset.link;
				if (url && visitedLinks.has(url)) {
					urls.push(url);
					item.classList.remove('visited');
				}
			});
		}

		if (urls.length > 0) {
			const newVisited = new Set(visitedLinks);
			for (const u of urls) newVisited.delete(u);
			visitedLinks = newVisited;
			await unmarkVisited(urls).catch(() => {});
		}
	}

	// --- Widget CRUD ---
	async function addWidget() {
		const res = await createWidget(pageId, {
			title: 'New RSS Feed',
			pos_x: Math.round(20 + Math.random() * 200),
			pos_y: Math.round(70 + Math.random() * 200),
			config: JSON.stringify({ feed_url: '' })
		});
		if (res.success && res.data) {
			widgets = new Map(widgets).set(res.data.id, res.data);
			editingWidgetId = res.data.id;
			showWidgetSettings = true;
		}
	}

	function openWidgetSettings(widgetId: string) {
		editingWidgetId = widgetId;
		showWidgetSettings = true;
	}

	function openHtmlEditor(widgetId: string) {
		editingWidgetId = widgetId;
		showHtmlEditorModal = true;
	}

	async function handleSaveWidget(data: {
		title: string;
		widget_type: string;
		bg_color: string;
		header_color: string;
		text_color: string;
		config: string;
	}) {
		if (!editingWidgetId) return;
		const res = await updateWidget(editingWidgetId, data);
		if (res.success && res.data) {
			widgets = new Map(widgets).set(res.data.id, res.data);
			showWidgetSettings = false;
			editingWidgetId = null;
		}
	}

	async function handleDeleteWidget() {
		if (!editingWidgetId) return;
		if (!confirm('Are you sure you want to delete this widget?')) return;
		await apiDeleteWidget(editingWidgetId);
		const newMap = new Map(widgets);
		newMap.delete(editingWidgetId);
		widgets = newMap;
		showWidgetSettings = false;
		editingWidgetId = null;
	}

	async function handleSaveHtml(content: string) {
		if (!editingWidgetId) return;
		const widget = widgets.get(editingWidgetId);
		if (!widget) return;
		const cfg = parseWidgetConfig(widget.config);
		(cfg as Record<string, unknown>).html_content = content;
		const res = await updateWidget(editingWidgetId, { config: JSON.stringify(cfg) });
		if (res.success && res.data) {
			widgets = new Map(widgets).set(res.data.id, res.data);
		}
		showHtmlEditorModal = false;
		editingWidgetId = null;
	}

	// --- Settings ---
	async function handleSaveSettings(settings: {
		name: string;
		bg_color: string;
		bg_image: string;
		config: string;
		slug: string;
		is_public: boolean;
		slug_access: boolean;
	}) {
		const res = await updatePage(pageId, settings);
		if (!res.success) {
			alert(res.error || 'Failed to save settings');
			return;
		}
		pageName = settings.name;
		bgColor = settings.bg_color;
		bgImage = settings.bg_image;
		slug = settings.slug;
		isPublic = settings.is_public;
		slugAccess = settings.slug_access;
		try {
			const cfg = JSON.parse(settings.config);
			pageConfig = { ...DEFAULT_PAGE_CONFIG, ...cfg };
			toolbarCollapsed = cfg.toolbar_collapsed || false;
		} catch { /* noop */ }

		showSettings = false;

		// Update URL if slug changed
		if (res.data?.slug) {
			const newUrl = `/page/${res.data.slug}`;
			if (window.location.pathname !== newUrl) window.history.replaceState(null, '', newUrl);
		} else if (res.data?.id) {
			const newUrl = `/page/${res.data.id}`;
			if (window.location.pathname !== newUrl) window.history.replaceState(null, '', newUrl);
		}
	}

	function handleExportWidgets() {
		const widgetsData = Array.from(widgets.values()).map((w) => ({
			title: w.title,
			widget_type: w.widget_type,
			pos_x: w.pos_x,
			pos_y: w.pos_y,
			width: w.width,
			height: w.height,
			bg_color: w.bg_color,
			header_color: w.header_color,
			text_color: w.text_color,
			config: w.config
		}));
		const exportData = {
			version: 3,
			exported_at: new Date().toISOString(),
			page_settings: {
				bg_color: bgColor,
				bg_image: bgImage,
				...pageConfig
			},
			widgets: widgetsData
		};
		const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `newsfornerds-widgets-${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	async function handleImportWidgets(file: File) {
		try {
			const text = await file.text();
			const data = JSON.parse(text);
			if (!data.widgets || !Array.isArray(data.widgets)) {
				alert('Invalid import file: missing widgets array');
				return;
			}
			const hasSettings = data.page_settings && typeof data.page_settings === 'object';
			if (!confirm(`Import ${data.widgets.length} widget(s)${hasSettings ? ' and page settings' : ''}?\n\nThis will REPLACE all current widgets.`)) return;

			const normalized = data.widgets.map((w: Record<string, unknown>) => {
				let config = w.config;
				if (typeof config === 'string') try { config = JSON.parse(config); } catch { config = {}; }
				return { ...w, config: config || {} };
			});

			const res = await apiImportWidgets(pageId, {
				widgets: normalized,
				page_settings: hasSettings ? data.page_settings : undefined
			});
			if (!res.success) throw new Error(res.error || 'Import failed');

			const newMap = new Map<string, Widget>();
			for (const w of res.data?.widgets || []) newMap.set(w.id, w);
			widgets = newMap;

			if (hasSettings) {
				const ps = data.page_settings;
				bgColor = ps.bg_color || '#1a1a2e';
				bgImage = ps.bg_image || '';
				pageConfig = {
					...DEFAULT_PAGE_CONFIG,
					grid_size: ps.grid_size ?? 0,
					show_grid: ps.show_grid ?? false,
					header_size: ps.header_size || 'normal',
					item_padding: ps.item_padding || 'normal',
					text_brightness: ps.text_brightness || 'normal',
					auto_refresh: ps.auto_refresh ?? 0,
					proxy_url: ps.proxy_url || '',
					proxy_user: ps.proxy_user || '',
					proxy_pass: ps.proxy_pass || ''
				};
			}
			showSettings = false;
			alert(`Successfully imported ${res.data?.widgets?.length || 0} widget(s)${hasSettings ? ' and page settings' : ''}`);
		} catch (err) {
			alert('Failed to import: ' + (err as Error).message);
		}
	}

	async function handleResetPage() {
		if (!confirm('Are you sure you want to reset this page?\n\nThis will remove ALL widgets and reset settings.')) return;
		const confirmText = prompt('Type "RESET" to confirm:');
		if (confirmText !== 'RESET') { alert('Reset cancelled.'); return; }

		for (const id of widgets.keys()) {
			await apiDeleteWidget(id);
		}
		widgets = new Map();

		const defaultConfig = JSON.stringify({ ...DEFAULT_PAGE_CONFIG, toolbar_collapsed: false });
		await updatePage(pageId, {
			bg_color: '#1a1a2e',
			bg_image: '',
			config: defaultConfig,
			slug: '',
			is_public: false
		});
		bgColor = '#1a1a2e';
		bgImage = '';
		pageConfig = { ...DEFAULT_PAGE_CONFIG };
		showSettings = false;
		window.location.href = `/page/${pageId}`;
	}

	function toggleToolbar() {
		toolbarCollapsed = !toolbarCollapsed;
		// Save to server
		const cfg = { ...pageConfig, toolbar_collapsed: toolbarCollapsed };
		updatePage(pageId, { config: JSON.stringify(cfg) }).catch(() => {});
	}

	function hideAllModals() {
		showSettings = false;
		showWidgetSettings = false;
		showHtmlEditorModal = false;
		showHelp = false;
		editingWidgetId = null;
	}

	function updateContentBounds() {
		// Expand body to fit all widgets
		let maxRight = 0;
		let maxBottom = 0;
		for (const w of widgets.values()) {
			maxRight = Math.max(maxRight, w.pos_x + w.width + 20);
			maxBottom = Math.max(maxBottom, w.pos_y + w.height + 20);
		}
		const container = document.getElementById('widget-container');
		if (container) {
			container.style.minWidth = `${maxRight}px`;
			container.style.minHeight = `${maxBottom}px`;
		}
	}

	// Background style
	let bgStyle = $derived(() => {
		let s = `background-color: ${bgColor};`;
		if (bgImage) s += ` background-image: url(${bgImage}); background-size: cover; background-position: center;`;
		return s;
	});

	// Grid style
	let gridStyle = $derived(() => {
		if (!pageConfig.show_grid || pageConfig.grid_size <= 0) return '';
		const g = pageConfig.grid_size;
		return `background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: ${g}px ${g}px;`;
	});
</script>

<div id="app" class:toolbar-collapsed={toolbarCollapsed} style={bgStyle()}>
	<Navbar
		{pageName}
		{isOwner}
		{auth}
		{toolbarCollapsed}
		onAddWidget={addWidget}
		onSettings={() => (showSettings = true)}
		onToggleHelp={() => (showHelp = !showHelp)}
		onToggleToolbar={toggleToolbar}
	/>

	<div id="widget-container" style={gridStyle()}>
		{#each widgetList as w (w.id)}
			<WidgetComponent
				widget={w}
				{isOwner}
				gridSize={pageConfig.grid_size}
				{visitedLinks}
				proxyUrl={pageConfig.proxy_url}
				proxyUser={pageConfig.proxy_user}
				proxyPass={pageConfig.proxy_pass}
				onSettings={openWidgetSettings}
				onHtmlEdit={openHtmlEditor}
				onMarkVisited={handleMarkVisited}
				onBoundsChanged={updateContentBounds}
			/>
		{/each}
	</div>

	{#if showSettings}
		<SettingsModal
			{pageId}
			{pageName}
			{bgColor}
			{bgImage}
			{pageConfig}
			{slug}
			{isPublic}
			{slugAccess}
			onSave={handleSaveSettings}
			onClose={() => (showSettings = false)}
			onExport={handleExportWidgets}
			onImport={handleImportWidgets}
			onReset={handleResetPage}
		/>
	{/if}

	{#if showWidgetSettings}
		<WidgetModal
			widget={editingWidget}
			onSave={handleSaveWidget}
			onDelete={handleDeleteWidget}
			onClose={() => {
				showWidgetSettings = false;
				editingWidgetId = null;
			}}
		/>
	{/if}

	{#if showHtmlEditorModal && editingWidget}
		<HtmlEditorModal
			content={(parseWidgetConfig(editingWidget.config) as WidgetConfig).html_content || ''}
			onSave={handleSaveHtml}
			onClose={() => {
				showHtmlEditorModal = false;
				editingWidgetId = null;
			}}
		/>
	{/if}

	{#if showHelp}
		<HelpOverlay onClose={() => (showHelp = false)} />
	{/if}
</div>
