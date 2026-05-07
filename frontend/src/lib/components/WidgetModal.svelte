<script lang="ts">
  import type { Widget } from '$lib/api/types.js';

  interface Props {
    widget: Widget | null;
    onSave: (data: {
      title: string;
      widget_type: string;
      bg_color: string;
      header_color: string;
      text_color: string;
      config: string;
    }) => void;
    onDelete: () => void;
    onClose: () => void;
  }

  let { widget, onSave, onDelete, onClose }: Props = $props();

  // Form state
  let widgetType = $state(widget?.widget_type ?? 'rss');
  let title = $state(widget?.title ?? '');
  let bgColor = $state(widget?.bg_color ?? '#1f2937');
  let headerColor = $state(widget?.header_color ?? '#374151');
  let textColor = $state(widget?.text_color ?? '#ffffff');

  // Parse config
  let config = $state(() => {
    if (widget?.config) {
      try {
        return typeof widget.config === 'string' ? JSON.parse(widget.config) : widget.config;
      } catch {
        return {};
      }
    }
    return {};
  });

  // RSS config
  let feedUrl = $state(config.feed_url ?? '');
  let showPreview = $state(config.show_preview ?? true);
  let maxItems = $state(config.max_items ?? 10);

  // Iframe config
  let pageUrl = $state(config.page_url ?? '');
  let horizontalOffset = $state(config.horizontal_offset ?? 0);
  let verticalOffset = $state(config.vertical_offset ?? 0);
  let cssOverrides = $state(config.css_overrides ?? '');

  // Common config
  let hideScrollbars = $state(config.hide_scrollbars ?? false);

  function handleBackgroundClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleSave() {
    let configObj: any = {
      hide_scrollbars: hideScrollbars
    };

    if (widgetType === 'rss') {
      configObj.feed_url = feedUrl;
      configObj.show_preview = showPreview;
      configObj.max_items = maxItems;
    } else if (widgetType === 'iframe') {
      configObj.page_url = pageUrl;
      configObj.horizontal_offset = horizontalOffset;
      configObj.vertical_offset = verticalOffset;
      configObj.css_overrides = cssOverrides;
    }

    onSave({
      title,
      widget_type: widgetType,
      bg_color: bgColor,
      header_color: headerColor,
      text_color: textColor,
      config: JSON.stringify(configObj)
    });
  }
</script>

<div class="modal" onclick={handleBackgroundClick}>
  <div class="modal-content">
    <div class="modal-header">
      <h2>{widget ? 'Edit Widget' : 'New Widget'}</h2>
      <button class="modal-close" onclick={onClose}>&times;</button>
    </div>
    
    <div class="modal-body">
      <div class="form-group">
        <label for="widget-type">Widget Type</label>
        <select id="widget-type" bind:value={widgetType}>
          <option value="rss">RSS Feed</option>
          <option value="iframe">Iframe</option>
          <option value="html">HTML</option>
        </select>
      </div>

      <div class="form-group">
        <label for="widget-title">Title</label>
        <input
          id="widget-title"
          type="text"
          bind:value={title}
          placeholder="Widget Title"
        />
      </div>

      {#if widgetType === 'rss'}
        <div class="form-group">
          <label for="feed-url">Feed URL</label>
          <input
            id="feed-url"
            type="text"
            bind:value={feedUrl}
            placeholder="https://example.com/feed.xml"
          />
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" bind:checked={showPreview} />
            Show preview
          </label>
        </div>

        <div class="form-group">
          <label for="max-items">Max Items</label>
          <input
            id="max-items"
            type="number"
            bind:value={maxItems}
            min="1"
            max="100"
          />
        </div>
      {/if}

      {#if widgetType === 'iframe'}
        <div class="form-group">
          <label for="page-url">Page URL</label>
          <input
            id="page-url"
            type="text"
            bind:value={pageUrl}
            placeholder="https://example.com"
          />
        </div>

        <div class="form-row">
          <div class="form-group half">
            <label for="h-offset">Horizontal Offset</label>
            <input
              id="h-offset"
              type="number"
              bind:value={horizontalOffset}
            />
          </div>

          <div class="form-group half">
            <label for="v-offset">Vertical Offset</label>
            <input
              id="v-offset"
              type="number"
              bind:value={verticalOffset}
            />
          </div>
        </div>

        <div class="form-group">
          <label for="css-overrides">CSS Overrides</label>
          <textarea
            id="css-overrides"
            bind:value={cssOverrides}
            placeholder={"body { background: white; }"}
            rows="4"
          ></textarea>
        </div>
      {/if}

      {#if widgetType === 'html'}
        <div class="form-group">
          <p style="color: #888; font-style: italic;">
            Use the ✏️ button on the widget to edit HTML content.
          </p>
        </div>
      {/if}

      <div class="form-group">
        <label>
          <input type="checkbox" bind:checked={hideScrollbars} />
          Hide scrollbars
        </label>
      </div>

      <div class="form-row">
        <div class="form-group half">
          <label for="bg-color">Background Color</label>
          <input
            id="bg-color"
            type="color"
            bind:value={bgColor}
          />
        </div>

        <div class="form-group half">
          <label for="header-color">Header Color</label>
          <input
            id="header-color"
            type="color"
            bind:value={headerColor}
          />
        </div>
      </div>

      <div class="form-group">
        <label for="text-color">Text Color</label>
        <input
          id="text-color"
          type="color"
          bind:value={textColor}
        />
      </div>
    </div>
    
    <div class="modal-footer">
      {#if widget}
        <button class="btn btn-danger" onclick={onDelete}>Delete</button>
      {/if}
      <button class="btn" onclick={onClose}>Cancel</button>
      <button class="btn btn-primary" onclick={handleSave}>Save</button>
    </div>
  </div>
</div>
