FROM rust:1-bookworm AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/backend /usr/local/bin/backend
EXPOSE 3000
CMD ["backend"]