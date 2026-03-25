package srv

import (
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"srv.exe.dev/db/dbgen"
)

// GetFavicon returns the cached favicon for a URL, or fetches it if not cached
func (s *Server) GetFavicon(ctx context.Context, feedURL string) (string, error) {
	q := dbgen.New(s.DB)

	// Check if we already have a favicon cached
	favicon, err := q.GetFeedFavicon(ctx, feedURL)
	if err == nil && favicon != nil && *favicon != "" {
		return *favicon, nil
	}

	// Parse the feed URL to get the domain
	parsed, err := url.Parse(feedURL)
	if err != nil {
		return "", err
	}

	baseURL := fmt.Sprintf("%s://%s", parsed.Scheme, parsed.Host)
	
	// Also try the root domain (without subdomains like 'feeds.' or 'rss.')
	rootDomain := parsed.Host
	parts := strings.Split(parsed.Host, ".")
	if len(parts) > 2 {
		// For feeds.example.com, try example.com
		rootDomain = strings.Join(parts[len(parts)-2:], ".")
	}
	rootURL := fmt.Sprintf("%s://%s", parsed.Scheme, rootDomain)

	// Try different favicon locations
	faviconURLs := []string{
		baseURL + "/favicon.ico",
		baseURL + "/favicon.png",
		baseURL + "/apple-touch-icon.png",
	}
	// Add root domain URLs if different
	if rootURL != baseURL {
		faviconURLs = append(faviconURLs,
			rootURL+"/favicon.ico",
			rootURL+"/favicon.png",
			rootURL+"/apple-touch-icon.png",
		)
	}

	var faviconData string
	for _, faviconURL := range faviconURLs {
		data, contentType, err := s.fetchFavicon(ctx, faviconURL)
		if err == nil && len(data) > 0 && strings.HasPrefix(contentType, "image/") {
			// Convert to base64 data URL
			faviconData = fmt.Sprintf("data:%s;base64,%s", contentType, base64.StdEncoding.EncodeToString(data))
			break
		}
	}

	// If we still don't have a favicon, try Google's favicon service as fallback
	if faviconData == "" {
		// Try with the full URL first, then just the host
		googleURLs := []string{
			fmt.Sprintf("https://www.google.com/s2/favicons?domain=%s&sz=32", parsed.Host),
			fmt.Sprintf("https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=%s&size=32", url.QueryEscape(feedURL)),
		}
		for _, googleURL := range googleURLs {
			data, contentType, err := s.fetchFavicon(ctx, googleURL)
			if err == nil && len(data) > 0 {
				faviconData = fmt.Sprintf("data:%s;base64,%s", contentType, base64.StdEncoding.EncodeToString(data))
				break
			}
		}
	}

	// Cache the result (even if empty, to avoid repeated fetches)
	if faviconData != "" {
		err = q.UpdateFeedFavicon(ctx, dbgen.UpdateFeedFaviconParams{
			Favicon: &faviconData,
			Url:     feedURL,
		})
		if err != nil {
			slog.Warn("failed to cache favicon", "url", feedURL, "error", err)
		}
	}

	return faviconData, nil
}

func (s *Server) fetchFavicon(ctx context.Context, faviconURL string) ([]byte, string, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", faviconURL, nil)
	if err != nil {
		return nil, "", err
	}
	req.Header.Set("User-Agent", "NewsForNerds/1.0")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()

	// Accept 200 OK, or for Google favicon service also accept other codes
	// since it returns images even with 404 status
	contentType := resp.Header.Get("Content-Type")
	isImage := strings.HasPrefix(contentType, "image/")
	
	if resp.StatusCode != http.StatusOK && !isImage {
		return nil, "", fmt.Errorf("status %d", resp.StatusCode)
	}

	if contentType == "" {
		contentType = "image/x-icon"
	}
	// Clean up content type
	if idx := strings.Index(contentType, ";"); idx > 0 {
		contentType = contentType[:idx]
	}

	// Limit size to 100KB
	data, err := io.ReadAll(io.LimitReader(resp.Body, 100*1024))
	if err != nil {
		return nil, "", err
	}

	return data, contentType, nil
}
