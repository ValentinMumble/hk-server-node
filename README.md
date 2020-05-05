# 🎧 HK Node server

> Node version of HK server

## Install

```bash
$ cp .env.dist .env
$ yarn install
```

## Run

```bash
$ yarn build
$ node build/index.js
```

or with forever

```bash
$ forever start -a --uid hk-server-node build/index.js
```
