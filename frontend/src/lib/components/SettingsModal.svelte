<script lang="ts">
  import type { PageConfig } from '$lib/api/types.js';
  import { checkSlug } from '$lib/api/client.js';

  interface Props {
    pageId: string;
    pageName: string;
    bgColor: string;
    bgImage: string;
    pageConfig: PageConfig;
    slug: string;
    isPublic: boolean;
    slugAccess: boolean;
    onSave: (settings: {
      name: string;
      bg_color: string;
      bg_image: string;
      config: string;
      slug: string;
      is_public: boolean;
      slug_access: boolean;
    }) => void;
    onClose: () => void;
    onExport: () => void;
    onImport: (file: File) => void;
    onReset: () => void;
  }

  let {
    pageId,
    pageName,
    bgColor,
    bgImage,
    pageConfig,
    slug,
    isPublic,
    slugAccess,
    onSave,
    onClose,
    onExport,
    onImport,
    onReset
  }: Props = $props();

  // Form state
  let name = $state(pageName);
  let currentSlug = $state(slug);
  let bgColorValue = $state(bgColor);
  let bgImageValue = $state(bgImage);
  let isPublicValue = $state(isPublic);
  let slugAccessValue = $state(slugAccess);
  
  // Config state
  let snapGrid = $state(pageConfig.snap_grid ?? 10);
  let showGrid = $state(pageConfig.show_grid ?? false);
  let widgetHeaderSize = $state(pageConfig.widget_header_size ?? 'normal');
  let feedItemPadding = $state(pageConfig.feed_item_padding ?? 'normal');
  let textBrightness = $state(pageConfig.text_brightness ?? 'normal');
  let autoRefresh = $state(pageConfig.auto_refresh?.toString() ?? 'disabled');
  let customRefreshMinutes = $state(15);
  let feedProxyUrl = $state(pageConfig.feed_proxy_url ?? '');
  let proxyUsername = $state(pageConfig.proxy_username ?? '');
  let proxyPassword = $state(pageConfig.proxy_password ?? '');

  // Slug checking state
  let slugCheckStatus = $state<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
  let slugCheckMessage = $state('');
  let slugCheckTimer: number | null = null;

  // Auto-refresh custom input visibility
  let showCustomRefresh = $state(autoRefresh === 'custom');

  // File input reference
  let fileInput: HTMLInputElement;

  // Watch for auto-refresh select changes
  $effect(() => {
    showCustomRefresh = autoRefresh === 'custom';
  });

  // Slug checking with debounce
  $effect(() => {
    if (currentSlug === slug) {
      slugCheckStatus = 'idle';
      slugCheckMessage = '';
      return;
    }

    if (slugCheckTimer) {
      clearTimeout(slugCheckTimer);
    }

    slugCheckStatus = 'checking';
    slugCheckMessage = 'Checking...';

    slugCheckTimer = window.setTimeout(async () => {
      try {
        const result = await checkSlug(pageId, currentSlug);
        if (result.available) {
          slugCheckStatus = 'available';
          slugCheckMessage = '✓ Available';
        } else {
          slugCheckStatus = 'unavailable';
          slugCheckMessage = `✗ ${result.reason || 'Not available'}`;
        }
      } catch (error) {
        slugCheckStatus = 'unavailable';
        slugCheckMessage = '✗ Error checking availability';
      }
    }, 300);
  });

  function handleBackgroundClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleSave() {
    const config: PageConfig = {
      snap_grid: snapGrid,
      show_grid: showGrid,
      widget_header_size: widgetHeaderSize as 'compact' | 'normal' | 'large',
      feed_item_padding: feedItemPadding as 'tight' | 'compact' | 'normal' | 'spacious',
      text_brightness: textBrightness as 'dim' | 'soft' | 'normal' | 'bright',
      auto_refresh: autoRefresh === 'custom' ? customRefreshMinutes : (autoRefresh === 'disabled' ? undefined : parseInt(autoRefresh)),
      feed_proxy_url: feedProxyUrl || undefined,
      proxy_username: proxyUsername || undefined,
      proxy_password: proxyPassword || undefined
    };

    onSave({
      name,
      bg_color: bgColorValue,
      bg_image: bgImageValue,
      config: JSON.stringify(config),
      slug: currentSlug,
      is_public: isPublicValue,
      slug_access: slugAccessValue
    });
  }

  function handleImportClick() {
    fileInput.click();
  }

  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      onImport(file);
      target.value = ''; // Reset file input
    }
  }
</script>

<div class="modal" onclick={handleBackgroundClick}>
  <div class="modal-content">
    <div class="modal-header">
      <h2>Page Settings</h2>
      <button class="modal-close" onclick={onClose}>&times;</button>
    </div>
    
    <div class="modal-body">
      <div class="form-group">
        <label for="page-name">Page Name</label>
        <input
          id="page-name"
          type="text"
          bind:value={name}
          placeholder="My Dashboard"
        />
      </div>

      <div class="form-group">
        <label for="page-slug">Custom URL / Slug</label>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="color: #888;">/page/</span>
          <input
            id="page-slug"
            type="text"
            bind:value={currentSlug}
            placeholder="my-page"
            style="flex: 1;"
          />
          {#if slugCheckStatus !== 'idle'}
            <span
              style:color={slugCheckStatus === 'available' ? '#4ade80' : slugCheckStatus === 'unavailable' ? '#f87171' : '#888'}
            >
              {slugCheckMessage}
            </span>
          {/if}
        </div>
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" bind:checked={isPublicValue} />
          Make page public
        </label>
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" bind:checked={slugAccessValue} />
          Allow access via custom URL without login
        </label>
      </div>

      <div class="form-row">
        <div class="form-group half">
          <label for="bg-color">Background Color</label>
          <input
            id="bg-color"
            type="color"
            bind:value={bgColorValue}
          />
        </div>

        <div class="form-group half">
          <label for="bg-image">Background Image URL</label>
          <input
            id="bg-image"
            type="text"
            bind:value={bgImageValue}
            placeholder="https://..."
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group half">
          <label for="snap-grid">Snap Grid Size</label>
          <input
            id="snap-grid"
            type="number"
            bind:value={snapGrid}
            min="0"
            max="100"
            step="5"
          />
        </div>

        <div class="form-group half">
          <label>
            <input type="checkbox" bind:checked={showGrid} />
            Show grid lines
          </label>
        </div>
      </div>

      <div class="form-group">
        <label for="widget-header-size">Widget Header Size</label>
        <select id="widget-header-size" bind:value={widgetHeaderSize}>
          <option value="compact">Compact</option>
          <option value="normal">Normal</option>
          <option value="large">Large</option>
        </select>
      </div>

      <div class="form-group">
        <label for="feed-item-padding">Feed Item Padding</label>
        <select id="feed-item-padding" bind:value={feedItemPadding}>
          <option value="tight">Tight</option>
          <option value="compact">Compact</option>
          <option value="normal">Normal</option>
          <option value="spacious">Spacious</option>
        </select>
      </div>

      <div class="form-group">
        <label for="text-brightness">Text Brightness</label>
        <select id="text-brightness" bind:value={textBrightness}>
          <option value="dim">Dim</option>
          <option value="soft">Soft</option>
          <option value="normal">Normal</option>
          <option value="bright">Bright</option>
        </select>
      </div>

      <div class="form-group">
        <label for="auto-refresh">Auto-Refresh</label>
        <select id="auto-refresh" bind:value={autoRefresh}>
          <option value="disabled">Disabled</option>
          <option value="1">1 minute</option>
          <option value="5">5 minutes</option>
          <option value="10">10 minutes</option>
          <option value="15">15 minutes</option>
          <option value="30">30 minutes</option>
          <option value="60">60 minutes</option>
          <option value="custom">Custom...</option>
        </select>
      </div>

      {#if showCustomRefresh}
        <div class="form-group">
          <label for="custom-refresh">Custom Refresh Interval (minutes)</label>
          <input
            id="custom-refresh"
            type="number"
            bind:value={customRefreshMinutes}
            min="1"
            max="1440"
          />
        </div>
      {/if}

      <div class="form-group">
        <label for="feed-proxy-url">Feed Proxy URL</label>
        <input
          id="feed-proxy-url"
          type="text"
          bind:value={feedProxyUrl}
          placeholder="https://proxy.example.com"
        />
      </div>

      <div class="form-row">
        <div class="form-group half">
          <label for="proxy-username">Proxy Username</label>
          <input
            id="proxy-username"
            type="text"
            bind:value={proxyUsername}
          />
        </div>

        <div class="form-group half">
          <label for="proxy-password">Proxy Password</label>
          <input
            id="proxy-password"
            type="password"
            bind:value={proxyPassword}
          />
        </div>
      </div>

      <div class="form-group">
        <label>Widget Management</label>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn" onclick={onExport}>Export Widgets</button>
          <button class="btn" onclick={handleImportClick}>Import Widgets</button>
          <input
            bind:this={fileInput}
            type="file"
            accept=".json"
            onchange={handleFileChange}
            style="display: none;"
          />
        </div>
      </div>

      <div class="form-group" style="margin-top: 2rem; padding-top: 1rem; border-top: 2px solid #dc2626;">
        <label style="color: #dc2626; font-weight: bold;">Danger Zone</label>
        <button class="btn btn-danger" onclick={onReset}>Reset Page</button>
      </div>
    </div>
    
    <div class="modal-footer">
      <button class="btn" onclick={onClose}>Cancel</button>
      <button class="btn btn-primary" onclick={handleSave}>Save</button>
    </div>
  </div>
</div>
