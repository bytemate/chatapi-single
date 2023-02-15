FROM node:19
WORKDIR /app
ARG TARGETPLATFORM

RUN echo "Building for $TARGETPLATFORM"

COPY debian-stable.list /tmp

# We don't need the standalone Chromium
RUN if [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
      apt-get install -y wget  curl gnupg \ 
        && cp /tmp/debian-stable.list /etc/apt/sources.list.d/ \
        && apt-get update && apt-get -y install chromium xvfb \
        && echo "Chrome: " && chromium --version \
        && ln -s /usr/bin/chromium /usr/bin/google-chrome-stable \
    else \
      apt-get install -y wget \ 
        && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \ 
        && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
        && apt-get update && apt-get -y install google-chrome-stable chromium  xvfb\
        && echo "Chrome: " && google-chrome --version ; \
   fi

# Remove tmp file
RUN rm -rf /var/lib/apt/lists/* 
RUN rm -rf /tmp/debian-stable.list

COPY package.json .
COPY package-lock.json .
RUN npm install
COPY . .
RUN npm run build
EXPOSE 4000
CMD npx prisma migrate deploy && xvfb-run --server-args="-screen 0 1280x800x24 -ac -nolisten tcp -dpi 96 +extension RANDR -maxclients 2048" node dist/index.js
