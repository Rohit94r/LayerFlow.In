package main

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/layerflow/terminal/internal/cloud"
	"github.com/layerflow/terminal/internal/config"
)

// listModels lists models available through the LayerFlow gateway.
func listModels() error {
	cfg, err := config.Load("")
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	key, err := cloud.ResolveAPIKey(cfg)
	if err != nil {
		return err
	}
	client := cloud.NewClient(cloud.ResolveBaseURL(cfg), key)

	models, err := client.ListModels(context.Background())
	if err != nil {
		return err
	}

	if len(models) == 0 {
		fmt.Println("No models advertised by the gateway.")
		return nil
	}

	for _, m := range models {
		avail := "unavailable"
		if m.Available {
			avail = "available"
		}
		fmt.Printf("%-28s %s\n", m.ID, avail)
	}
	return nil
}

// listModelsJSON emits the model list as machine-readable JSON.
func listModelsJSON() error {
	cfg, err := config.Load("")
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	key, err := cloud.ResolveAPIKey(cfg)
	if err != nil {
		return err
	}
	client := cloud.NewClient(cloud.ResolveBaseURL(cfg), key)

	models, err := client.ListModels(context.Background())
	if err != nil {
		return err
	}

	out, err := json.MarshalIndent(models, "", "  ")
	if err != nil {
		return err
	}
	fmt.Println(string(out))
	return nil
}
