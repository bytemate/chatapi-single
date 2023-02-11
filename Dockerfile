FROM node:19
WORKDIR /app
# We don't need the standalone Chromium
RUN apt-get install -y wget \ 
  && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \ 
  && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
  && apt-get update && apt-get -y install google-chrome-stable chromium  xvfb\
  && rm -rf /var/lib/apt/lists/* \
  && echo "Chrome: " && google-chrome --version
COPY package.json .
COPY package-lock.json .
RUN npm install
COPY . .
RUN npm run build
EXPOSE 4000
CMD ["bash","-c","npx prisma migrate deploy && node dist/index.js"]