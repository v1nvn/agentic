# syntax=docker/dockerfile:1
#
# Build context is the REPO ROOT (the workspace installs from root manifests):
#   docker build -f packages/readability-mcp/Dockerfile -t readability-mcp .

FROM node:26-trixie-slim AS build
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY packages/readability-mcp/package.json packages/readability-mcp/
RUN npm install -g corepack && corepack enable && yarn install --immutable
COPY packages/readability-mcp/ ./packages/readability-mcp/
RUN yarn workspace @v1nvn/readability-mcp run build

FROM node:26-trixie-slim AS runtime
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY packages/readability-mcp/package.json packages/readability-mcp/
RUN npm install -g corepack && corepack enable && yarn workspaces focus @v1nvn/readability-mcp --production && yarn cache clean
COPY --from=build /app/packages/readability-mcp/dist ./packages/readability-mcp/dist
ENV NODE_ENV=production
USER node
CMD ["node", "packages/readability-mcp/dist/index.js"]
