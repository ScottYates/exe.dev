package main

import (
	"flag"
	"fmt"
	"log/slog"
	"os"

	"srv.exe.dev/srv"
)

var (
	flagListenAddr = flag.String("listen", "", "address to listen on (overrides LISTEN_ADDR)")
	flagEnvFile    = flag.String("env", ".env", "path to .env file")
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	flag.Parse()

	// Load config from .env and environment
	cfg, err := srv.LoadConfig(*flagEnvFile)
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	// CLI flag overrides config
	if *flagListenAddr != "" {
		cfg.ListenAddr = *flagListenAddr
	}

	// Set up logging to file + stderr
	cleanup, err := srv.SetupLogging(cfg.LogFile, cfg.LogLevel)
	if err != nil {
		return fmt.Errorf("setup logging: %w", err)
	}
	defer cleanup()

	slog.Info("loaded configuration",
		"env_file", *flagEnvFile,
		"listen", cfg.ListenAddr,
		"db", cfg.DBPath,
		"log_file", cfg.LogFile,
		"log_level", cfg.LogLevel,
	)

	hostname, err := os.Hostname()
	if err != nil {
		hostname = "unknown"
	}

	server, err := srv.New(cfg, hostname)
	if err != nil {
		slog.Error("failed to create server", "error", err)
		return fmt.Errorf("create server: %w", err)
	}

	return server.Serve(cfg.ListenAddr)
}
