FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code globally
RUN npm install -g @anthropic-ai/claude-code

# Create directories for managed settings
RUN mkdir -p /etc/claude-code

# Set working directory
WORKDIR /workspace

# Create node user with sudo access
RUN echo "node ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Create .aaw directories
RUN mkdir -p /workspace/.aaw/logs /workspace/.aaw/evidence

# Set ownership
RUN chown -R node:node /workspace

USER node
