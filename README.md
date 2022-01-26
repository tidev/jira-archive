# Appcelerator JIRA Archive

This repo contains the jira-archive.tisdk.com website and the corresponding JIRA data dump from November 2021.

## Install

```bash
pnpm i
pnpm run build
```

## Dev

First, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deploy

One time:

```bash
git remote add dokku dokku@tisdk.com:jira-archive
```

Then to release:

```bash
git push dokku main
```
