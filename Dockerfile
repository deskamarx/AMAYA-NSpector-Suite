FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

ENV PORT=10000
ENV NSPECTOR_DB=/tmp/nspector.db

EXPOSE 10000

CMD ["node", "server/server.js"]