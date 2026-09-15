package models

import "maps"

type (
	ModelID       string
	ModelProvider string
)

type Model struct {
	ID                  ModelID       `json:"id"`
	Name                string        `json:"name"`
	Provider            ModelProvider `json:"provider"`
	APIModel            string        `json:"api_model"`
	CostPer1MIn         float64       `json:"cost_per_1m_in"`
	CostPer1MOut        float64       `json:"cost_per_1m_out"`
	CostPer1MInCached   float64       `json:"cost_per_1m_in_cached"`
	CostPer1MOutCached  float64       `json:"cost_per_1m_out_cached"`
	ContextWindow       int64         `json:"context_window"`
	DefaultMaxTokens    int64         `json:"default_max_tokens"`
	CanReason           bool          `json:"can_reason"`
	SupportsAttachments bool          `json:"supports_attachments"`
}

// Providers
const (
	ProviderCopilot    ModelProvider = "copilot"
	ProviderAnthropic  ModelProvider = "anthropic"
	ProviderOpenAI     ModelProvider = "openai"
	ProviderGemini     ModelProvider = "gemini"
	ProviderGROQ       ModelProvider = "groq"
	ProviderOpenRouter ModelProvider = "openrouter"
	ProviderBedrock    ModelProvider = "bedrock"
	ProviderAzure      ModelProvider = "azure"
	ProviderVertexAI   ModelProvider = "vertex-ai"
	ProviderXAI        ModelProvider = "x.ai"

	// LayerFlow gateway provider
	ProviderLayerFlow ModelProvider = "layerflow"
)

// Providers in order of popularity
var ProviderPopularity = map[ModelProvider]int{
	ProviderLayerFlow:  0,
	ProviderCopilot:    1,
	ProviderAnthropic:  2,
	ProviderOpenAI:     3,
	ProviderGemini:     4,
	ProviderGROQ:       5,
	ProviderOpenRouter: 6,
	ProviderBedrock:    7,
	ProviderAzure:      8,
	ProviderVertexAI:   9,
	ProviderXAI:        10,
}

// SupportedModels maps ModelIDs to their metadata. It is populated at startup
// from the LayerFlow model registry (plus any statically known models).
var SupportedModels = map[ModelID]Model{}

// RegisterModels merges the given model metadata into the supported models map.
func RegisterModels(modelsToAdd map[ModelID]Model) {
	maps.Copy(SupportedModels, modelsToAdd)
}

// KnownModel returns the metadata for a model, falling back to a minimal
// synthetic entry so the UI never panics on unknown model IDs.
func KnownModel(id ModelID) Model {
	if m, ok := SupportedModels[id]; ok {
		return m
	}
	return Model{
		ID:            id,
		Name:          string(id),
		Provider:      ProviderLayerFlow,
		APIModel:      string(id),
		ContextWindow: 128000,
	}
}
