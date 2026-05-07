<script lang="ts">
	import type { AuthStatus } from '$lib/api/types.js';
	import { getInitials } from '$lib/utils.js';

	let {
		pageName,
		isOwner,
		auth,
		toolbarCollapsed,
		onAddWidget,
		onSettings,
		onToggleHelp,
		onToggleToolbar
	}: {
		pageName: string;
		isOwner: boolean;
		auth: AuthStatus;
		toolbarCollapsed: boolean;
		onAddWidget: () => void;
		onSettings: () => void;
		onToggleHelp: () => void;
		onToggleToolbar: () => void;
	} = $props();

	let showDropdown = $state(false);

	function handleLogin() {
		window.location.href = '/auth/login?return=' + encodeURIComponent(window.location.href);
	}

	function handleLogout() {
		window.location.href = '/auth/logout';
	}

	function toggleDropdown(e: MouseEvent) {
		e.stopPropagation();
		showDropdown = !showDropdown;
	}

	function closeDropdown() {
		showDropdown = false;
	}

	$effect(() => {
		if (typeof document !== 'undefined') {
			document.addEventListener('click', closeDropdown);
			return () => document.removeEventListener('click', closeDropdown);
		}
	});
</script>

<div id="toolbar" class:collapsed={toolbarCollapsed}>
	<div class="toolbar-left">
		<span class="logo">🤓 NewsForNerds</span>
		<span class="page-name">
			{pageName}
			{#if !isOwner}<span class="viewing-badge">(viewing)</span>{/if}
		</span>
	</div>
	<div class="toolbar-right">
		{#if isOwner}
			<button class="btn btn-primary" onclick={onAddWidget}>+ Add Widget</button>
		{/if}
		<button class="btn" title="Keyboard shortcuts (H)" onclick={onToggleHelp}>?</button>
		{#if isOwner}
			<button class="btn" onclick={onSettings}>⚙️ Settings</button>
		{/if}
		<div class="user-menu" style="position: relative;">
			{#if auth.authenticated && auth.user}
				{#if auth.user.picture}
					<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
					<img
						class="user-avatar"
						src={auth.user.picture}
						alt=""
						title={auth.user.name || auth.user.email}
						onclick={toggleDropdown}
					/>
				{:else}
					<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
					<div class="initials-avatar" title={auth.user.name || auth.user.email} onclick={toggleDropdown}>
						{getInitials(auth.user.name || auth.user.email)}
					</div>
				{/if}
				{#if auth.auth_type === 'exedev' && auth.oauth_enabled}
					<button class="btn" title="Login with Google for profile picture" onclick={handleLogin}>📷</button>
				{/if}
				{#if showDropdown}
					<div class="user-dropdown show">
						<div class="user-dropdown-info">
							<div class="user-dropdown-name">{auth.user.name || auth.user.email}</div>
							<div class="user-dropdown-email">{auth.user.email}</div>
						</div>
						{#if auth.auth_type === 'exedev' && auth.oauth_enabled}
							<button class="user-dropdown-item" onclick={handleLogin}>Login with Google</button>
						{/if}
						{#if auth.auth_type === 'google'}
							<button class="user-dropdown-item" onclick={handleLogout}>Logout</button>
						{/if}
					</div>
				{/if}
			{:else if auth.oauth_enabled}
				<button class="btn" onclick={handleLogin}>Login</button>
			{/if}
		</div>
	</div>
</div>

<button
	class="toolbar-toggle-fixed"
	title={toolbarCollapsed ? 'Show toolbar' : 'Hide toolbar'}
	onclick={onToggleToolbar}
>
	{toolbarCollapsed ? '⬇️' : '⬆️'}
</button>
