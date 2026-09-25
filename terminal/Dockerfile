# Multi-stage static build of the `lf` CLI. Pairs with the `docker` target in
# the Makefile (`docker build -t layerflow/lf .`) and is published to ghcr.io
# by .github/workflows/docker.yml.

#--------- 1. build ----------
FROM golang:1.25-alpine AS build
WORKDIR /src

# Resolve module deps first for layer caching.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/lf ./cmd/lf

#--------- 2. runtime ----------
FROM alpine:3.21
RUN apk --no-cache add ca-certificates tzdata
COPY --from=build /out/lf /usr/local/bin/lf
ENTRYPOINT ["lf"]
CMD ["--help"]