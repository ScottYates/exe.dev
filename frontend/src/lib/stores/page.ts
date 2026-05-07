import { writable, derived } from 'svelte/store';
import type { Widget, PageConfig, AuthStatus } from '$lib/api/types.js';
import { DEFAULT_PAGE_CONFIG } from '$lib/api/types.js';

// Page metadata (set from server-rendered data attributes)
export const pageId = writable('');
export const pageName = writable('My Page');
export const bgColor = writable('#1a1a2e');
export const bgImage = writable('');
export const isOwner = writable(false);
export const isPublic = writable(false);
export const pageSlug = writable('');
export const slugAccess = writable(false);

// Page config (grid, header size, etc.)
export const pageConfig = writable<PageConfig>({ ...DEFAULT_PAGE_CONFIG });

// Auth state
export const authStatus = writable<AuthStatus>({
	authenticated: false,
	oauth_enabled: false
});

// Widgets map
export const widgets = writable<Map<string, Widget>>(new Map());

// Visited links
export const visitedLinks = writable<Set<string>>(new Set());

// Currently editing widget
export const editingWidgetId = writable<string | null>(null);

// Active widget (for keyboard shortcuts)
export const activeWidgetId = writable<string | null>(null);

// Modal states
export const showSettingsModal = writable(false);
export const showWidgetModal = writable(false);
export const showHtmlEditor = writable(false);
export const showHelpOverlay = writable(false);

// Toolbar state
export const toolbarCollapsed = writable(false);

// Derived: widgets as array (for iteration)
export const widgetList = derived(widgets, ($widgets) => Array.from($widgets.values()));
