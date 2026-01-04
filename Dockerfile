# IC Commerce Development Environment
# Includes: Rust, Node.js, dfx, wasi2ic

FROM ubuntu:22.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    pkg-config \
    libssl-dev \
    ca-certificates \
    socat \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -s /bin/bash developer
USER developer
WORKDIR /home/developer

# Install Rust via rustup
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/home/developer/.cargo/bin:${PATH}"

# Add WebAssembly target
RUN rustup target add wasm32-wasip1

# Install wasi2ic
RUN cargo install wasi2ic

# Install dfx (use DFX_VERSION env var or defaults to latest)
RUN DFXVM_INIT_YES=1 sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
ENV PATH="/home/developer/.local/share/dfx/bin:${PATH}"

# Set working directory for the app
WORKDIR /app

# Copy package files first (better layer caching)
COPY --chown=developer:developer package*.json ./

# Install npm dependencies
RUN npm install

# Copy the rest of the application
COPY --chown=developer:developer . .

# Expose ports
# 4943 - dfx replica
# 5173 - Vite dev server
EXPOSE 4943 5173

# Copy entrypoint script
COPY --chown=developer:developer scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Default command
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
