FROM node:19
WORKDIR /app
# We don't need the standalone Chromium
COPY debian-stable.list /etc/apt/sources.list.d/debian-stable.list
RUN apt-get install -y wget  curl gnupg \ 
  && apt-get update && apt-get -y install chromium xvfb \
  && echo "Chrome: " && chromium --version \
  && ln -s /usr/bin/chromium /usr/bin/google-chrome-stable
  && rm -rf /var/lib/apt/lists/* 

COPY package.json .
COPY package-lock.json .
RUN npm install
COPY . .
RUN npm run build
EXPOSE 4000
CMD npx prisma migrate deploy && xvfb-run --server-args="-screen 0 1280x800x24 -ac -nolisten tcp -dpi 96 +extension RANDR -maxclients 2048" node dist/index.js
