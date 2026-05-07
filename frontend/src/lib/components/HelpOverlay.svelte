<script lang="ts">
	let { onClose }: { onClose: () => void } = $props();

	function handleBackgroundClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onClose();
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="help-overlay" onclick={handleBackgroundClick}>
	<div class="help-content">
		<div class="help-header">
			<h2>⌨️ Keyboard Shortcuts</h2>
			<button class="help-close" onclick={onClose}>&times;</button>
		</div>
		<div class="help-body">
			<div class="help-section">
				<h3>Widget Actions</h3>
				<div class="help-row"><kbd>X</kbd> <span>Mark all items as read (while clicking in widget)</span></div>
				<div class="help-row"><kbd>Z</kbd> <span>Mark all items as unread (while clicking in widget)</span></div>
			</div>
			<div class="help-section">
				<h3>Navigation</h3>
				<div class="help-row"><kbd>?</kbd> or <kbd>H</kbd> <span>Toggle this help</span></div>
				<div class="help-row"><kbd>Esc</kbd> <span>Close dialogs/help</span></div>
			</div>
			<div class="help-section">
				<h3>Widget Editing</h3>
				<div class="help-row"><span>🔒/🔓</span> <span>Lock/unlock widget position and size</span></div>
				<div class="help-row"><span>⚙️</span> <span>Widget settings</span></div>
				<div class="help-row"><span>🔄</span> <span>Refresh feed</span></div>
				<div class="help-row"><span>✏️</span> <span>Edit HTML content</span></div>
			</div>
		</div>
	</div>
</div>
