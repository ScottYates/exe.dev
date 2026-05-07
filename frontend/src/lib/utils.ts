export function formatDate(dateStr: string): string {
	try {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();

		if (diff < 3600000) {
			const mins = Math.floor(diff / 60000);
			return `${mins}m ago`;
		}
		if (diff < 86400000) {
			const hours = Math.floor(diff / 3600000);
			return `${hours}h ago`;
		}
		if (diff < 604800000) {
			const days = Math.floor(diff / 86400000);
			return `${days}d ago`;
		}
		return date.toLocaleDateString();
	} catch {
		return dateStr;
	}
}

export function escapeHtml(str: string): string {
	if (!str) return '';
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

export function stripHtml(html: string): string {
	if (typeof document !== 'undefined') {
		const tmp = document.createElement('div');
		tmp.innerHTML = html;
		return tmp.textContent || tmp.innerText || '';
	}
	return html.replace(/<[^>]*>/g, '');
}

export function truncateText(text: string, maxLen: number): string {
	if (text.length <= maxLen) return text;
	return text.substring(0, maxLen) + '...';
}

export function snapToGrid(value: number, gridSize: number): number {
	if (gridSize <= 0) return value;
	return Math.round(value / gridSize) * gridSize;
}

export function getInitials(name: string): string {
	if (!name) return '?';
	const parts = name.split(/[@\s]+/);
	if (parts.length >= 2) {
		return (parts[0][0] + parts[1][0]).toUpperCase();
	}
	return name.substring(0, 2).toUpperCase();
}

export function parseWidgetConfig(configStr: string): Record<string, unknown> {
	try {
		return JSON.parse(configStr || '{}');
	} catch {
		return {};
	}
}
