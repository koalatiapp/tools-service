# "node" stage
ARG NODE_VERSION=14
FROM node:${NODE_VERSION} as express_node

ENV NODE_ENV=${NODE_ENV}

# Create app directory
WORKDIR /app

# Install Puppeteer dependencies
RUN apt-get update && \
	apt-get install -y \
	ca-certificates \
	fonts-liberation \
	libappindicator3-1 \
	libasound2 \
	libatk-bridge2.0-0 \
	libatk1.0-0 \
	libc6 \
	libcairo2 \
	libcups2 \
	libdbus-1-3 \
	libexpat1 \
	libfontconfig1 \
	libgbm1 \
	libgcc1 \
	libglib2.0-0 \
	libgtk-3-0 \
	libnspr4 \
	libnss3 \
	libpango-1.0-0 \
	libpangocairo-1.0-0 \
	libstdc++6 \
	libx11-6 \
	libx11-xcb1 \
	libxcb1 \
	libxcomposite1 \
	libxcursor1 \
	libxdamage1 \
	libxext6 \
	libxfixes3 \
	libxi6 \
	libxrandr2 \
	libxrender1 \
	libxss1 \
	libxtst6 \
	lsb-release \
	wget \
	xdg-utils \
	chromium

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production
# If you are building your code for development, use...
# RUN npm install

# Bundle app source
COPY . .

# Update permissions in the directory
RUN chown -R node:node .

# Switch to a non-root user
USER node

EXPOSE 3000
CMD ["node", "src/server.js"]
