<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface Props {
    content: string;
    onSave: (content: string) => void;
    onClose: () => void;
  }

  let { content, onSave, onClose }: Props = $props();

  let editorElement: HTMLTextAreaElement;
  let editorId = `tinymce-${Math.random().toString(36).substr(2, 9)}`;
  let editor: any = null;
  let fallbackContent = $state(content);
  let useFallback = $state(false);

  onMount(() => {
    initializeEditor();
  });

  onDestroy(() => {
    destroyEditor();
  });

  async function initializeEditor() {
    // Check if TinyMCE is available
    if (typeof (window as any).tinymce === 'undefined') {
      console.warn('TinyMCE not available, using fallback textarea');
      useFallback = true;
      return;
    }

    const tinymce = (window as any).tinymce;

    try {
      await tinymce.init({
        target: editorElement,
        skin: 'oxide-dark',
        content_css: 'dark',
        height: 500,
        menubar: true,
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
          'insertdatetime', 'media', 'table', 'help', 'wordcount'
        ],
        toolbar: 'undo redo | blocks | ' +
          'bold italic forecolor | alignleft aligncenter ' +
          'alignright alignjustify | bullist numlist outdent indent | ' +
          'removeformat | code | help',
        content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; }',
        setup: (ed: any) => {
          editor = ed;
        }
      });
    } catch (error) {
      console.error('Failed to initialize TinyMCE:', error);
      useFallback = true;
    }
  }

  function destroyEditor() {
    if (editor) {
      try {
        editor.destroy();
      } catch (error) {
        console.error('Error destroying TinyMCE:', error);
      }
      editor = null;
    }
  }

  function handleBackgroundClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }

  function handleSave() {
    let contentToSave: string;

    if (useFallback) {
      contentToSave = fallbackContent;
    } else if (editor) {
      contentToSave = editor.getContent();
    } else {
      contentToSave = content;
    }

    onSave(contentToSave);
  }

  function handleClose() {
    destroyEditor();
    onClose();
  }
</script>

<div class="modal" onclick={handleBackgroundClick}>
  <div class="modal-content modal-fullscreen">
    <div class="modal-header">
      <h2>HTML Editor</h2>
      <button class="modal-close" onclick={handleClose}>&times;</button>
    </div>
    
    <div class="modal-body">
      {#if useFallback}
        <textarea
          bind:value={fallbackContent}
          placeholder="Enter HTML content..."
          style="width: 100%; min-height: 500px; font-family: monospace; padding: 0.5rem;"
        ></textarea>
      {:else}
        <textarea
          bind:this={editorElement}
          id={editorId}
          value={content}
        ></textarea>
      {/if}
    </div>
    
    <div class="modal-footer">
      <button class="btn" onclick={handleClose}>Cancel</button>
      <button class="btn btn-primary" onclick={handleSave}>Save</button>
    </div>
  </div>
</div>
