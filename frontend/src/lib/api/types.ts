// API response wrapper
export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
}

export interface Widget {
	id: string;
	page_id: string;
	title: string;
	widget_type: 'rss' | 'iframe' | 'html';
	pos_x: number;
	pos_y: number;
	width: number;
	height: number;
	bg_color: string;
	text_color: string;
	header_color: string;
	config: string; // JSON string
	created_at: string;
	updated_at: string;
}

export interface WidgetConfig {
	// RSS
	feed_url?: string;
	show_preview?: boolean;
	max_items?: number;
	// Iframe
	iframe_url?: string;
	offset_x?: number;
	offset_y?: number;
	iframe_css?: string;
	// HTML
	html_content?: string;
	// Common
	hide_scrollbars?: boolean;
	locked?: boolean;
}

export interface FeedItem {
	title: string;
	link: string;
	description: string;
	published: string;
	author: string;
}

export interface FeedData {
	title: string;
	items: FeedItem[];
	pending?: boolean;
	client_fetch_url?: string;
}

export interface PageData {
	id: string;
	name: string;
	bg_color: string;
	bg_image: string;
	config: string; // JSON string
	slug?: string;
	is_public?: number;
	slug_access?: number;
	is_owner: boolean;
}

export interface PageConfig {
	grid_size: number;
	show_grid: boolean;
	header_size: 'compact' | 'normal' | 'large';
	item_padding: 'tight' | 'compact' | 'normal' | 'spacious';
	text_brightness: 'dim' | 'soft' | 'normal' | 'bright';
	toolbar_collapsed: boolean;
	auto_refresh: number;
	proxy_url: string;
	proxy_user: string;
	proxy_pass: string;
}

export interface AuthStatus {
	authenticated: boolean;
	oauth_enabled: boolean;
	auth_type?: 'google' | 'exedev';
	user?: {
		name: string;
		email: string;
		picture: string;
	};
}

export interface SlugCheck {
	available: boolean;
	reason?: string;
}

export const DEFAULT_PAGE_CONFIG: PageConfig = {
	grid_size: 0,
	show_grid: false,
	header_size: 'normal',
	item_padding: 'normal',
	text_brightness: 'normal',
	toolbar_collapsed: false,
	auto_refresh: 0,
	proxy_url: '',
	proxy_user: '',
	proxy_pass: ''
};
