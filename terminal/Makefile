.PHONY: build test lint clean install

VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
COMMIT ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "none")
DATE ?= $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

LDFLAGS = -s -w -X main.version=$(VERSION) -X main.commit=$(COMMIT) -X main.date=$(DATE)

build:
	go build -ldflags "$(LDFLAGS)" -o bin/lf ./cmd/lf

install:
	go install -ldflags "$(LDFLAGS)" ./cmd/lf

test:
	go test -race ./...

lint:
	golangci-lint run ./...

vet:
	go vet ./...

clean:
	rm -rf bin/

run: build
	./bin/lf

# Development targets
dev:
	go run ./cmd/lf

# Release targets
release:
	goreleaser release --clean

snapshot:
	goreleaser release --snapshot --clean

# Database targets
migrate:
	go run ./cmd/lf doctor

# Docker targets
docker:
	docker build -t layerflow/lf .

# CI targets
ci: vet lint test build
