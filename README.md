<h1 align="center">Welcome to chatgpt-api-single 👋</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000" />
  <a href="#" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
  <a href="https://twitter.com/fuergaosi" target="_blank">
    <img alt="Twitter: fuergaosi" src="https://img.shields.io/twitter/follow/fuergaosi.svg?style=social" />
  </a>
</p>

> Chatgpt-api-single is a simple, easy-to-use API server that comes with a queueing capability to prevent large-scale failures due to excessive access. It has a simple encapsulation and comes with a Dockerfile, so all you need to do is modify the environment variables to get started. :thumbsup:

## Quick Start

```sh
docker run -d --name chatgpt-api-single -e EMAIL=<YourOpenAIAccount> -e PASSWORD=<YourOpenAIAccountPassword> -p 4000:4000 -v ${PWD}/data:/app/data ghcr.io/bytemate/chatapi-single:main
# See log
docker logs -f chatgpt-api-single
```

For how generate session, all you need is your access token from https://chat.openai.com/api/auth/session
```sh
docker run -d --name chatgpt-api-single -e API_KEY=<YourSesstion> -p 4000:4000 -v $PWD/data:/app/data ghcr.io/bytemate/chatapi-single:main
```
## Config

```sh
cp .env.example .env
```


**Modify the environment variables in .env**

```dotenv
# Require
EMAIL=<Your Email>
# Require
PASSWORD=<Your Password>
IS_PRO_ACCOUNT=false
MARKDOWN=false
DEBUG=false
IS_GOOGLE_LOGIN=false
IS_MICROSOFT_LOGIN=false
MINIMIZE=false
CAPTCHA_TOKEN=
NOPECHA_KEY=
EXECUTABLE_PATH=
PROXY_SERVER=
USER_DATA_DIR=
```
## Install

```sh
npm i
npx prisma migrate deploy
```

## Usage

```sh
npm run start
```
## How to use 

### OneTime Message
```sh
curl -X "POST" "http://localhost:4000/message" \
     -H 'Content-Type: application/json; charset=utf-8' \
     -d $'{
  "message": "Hello"
}'
```
### Session Message
```sh
curl -X "POST" "http://localhost:4000/message/holegots" \
     -H 'Content-Type: application/json; charset=utf-8' \
     -d $'{
  "message": "Hello"
}'
```

## Author

👤 **Holeogts**

* Twitter: [@fuergaosi](https://twitter.com/fuergaosi)
* Github: [@fuergaosi233](https://github.com/fuergaosi233)

## Show your support

Give a ⭐️ if this project helped you!

***
_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_
