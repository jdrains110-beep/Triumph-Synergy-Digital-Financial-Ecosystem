FROM rust:1.75-alpine AS builder

RUN apk add --no-cache musl-dev openssl-dev

WORKDIR /app

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Build dependencies (cached layer)
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Copy source code
COPY src ./src

# Build application
RUN touch src/main.rs && \
    cargo build --release

# Runtime stage
FROM alpine:latest

RUN apk add --no-cache ca-certificates libgcc

WORKDIR /app

COPY --from=builder /app/target/release/contract-processor /app/contract-processor

EXPOSE 8080

CMD ["/app/contract-processor"]
