import { mount } from 'svelte';
import Dashboard from '$lib/components/Dashboard.svelte';
import './app.css';

const app = document.getElementById('app')!;

// Read page data from Go-rendered data attributes
const pageId = app.dataset.pageId || '';
const pageName = app.dataset.pageName || app.querySelector('.page-name')?.textContent?.trim() || 'My Page';
const bgColor = app.dataset.bgColor || '#1a1a2e';
const bgImage = app.dataset.bgImage || '';
const pageConfig = app.dataset.config || '{}';
const isOwner = app.dataset.isOwner === 'true';
const isPublic = app.dataset.isPublic === '1';
const slug = app.dataset.slug || '';
const slugAccess = app.dataset.slugAccess === '1';

// Clear the Go-rendered content before mounting Svelte
app.innerHTML = '';

mount(Dashboard, {
	target: app,
	props: {
		pageId,
		pageName,
		bgColor,
		bgImage,
		pageConfig,
		isOwner,
		isPublic,
		slug,
		slugAccess
	}
});
