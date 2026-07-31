# Small, fast base image
FROM node:20-alpine

WORKDIR /app

# Install dependencies first so Docker can cache this layer
COPY package.json ./
RUN npm install --omit=dev

# Copy the rest of the proxy source
COPY server.js ./

EXPOSE 3000

CMD ["node", "server.js"]
