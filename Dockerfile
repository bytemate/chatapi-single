FROM node:20
WORKDIR /app
COPY package.json .
COPY package-lock.json .

RUN npm config set update-notifier false
RUN npm install
COPY . .
RUN npm run build
EXPOSE 4000
CMD npx prisma migrate deploy && node dist/index.js