# --- Frontend ---
# Instantiate node image and install dependencies
FROM node:20-alpine AS frontend
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend .
# Build the frontend
RUN npm run build

# --- Backend ---
# Instantiate golang image
FROM golang:1.23-alpine AS backend
# Install CA certificates
RUN apk add --no-cache ca-certificates
# Install dependencies
WORKDIR /backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
# Copy the frontend build
COPY --from=frontend /frontend/dist ./frontend/dist
# Build the Go application
RUN CGO_ENABLED=0 go build -o app .  

# --- Runtime ---
# Use a minimal image for runtime
FROM alpine:latest
WORKDIR /app
# Install CA certificates for TLS (MongoDB Atlas, etc.)
RUN apk add --no-cache ca-certificates
# Copy the built backend application
COPY --from=backend /backend/app .
# Copy the built frontend dist
COPY --from=frontend /frontend/dist ./frontend/dist
# Ensure static assets get a fresh mtime each deploy so browsers don't keep a stale cached copy.
RUN find ./frontend/dist -type f -exec touch -c {} +
# Expose the application port
EXPOSE 8080
# Run the Go executable
CMD ["./app"]