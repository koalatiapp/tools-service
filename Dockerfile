# "node" stage
ARG NODE_VERSION=14
FROM node:${NODE_VERSION} as express_node

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./

RUN npm ci --only=production
# If you are building your code for development, use...
# RUN npm install

# Bundle app source
COPY . .

EXPOSE 3000
CMD ["node", "src/server.js"]
