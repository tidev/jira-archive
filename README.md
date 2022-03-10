# Appcelerator JIRA Archive

This repo contains the jira-archive.titaniumsdk.com website and the corresponding JIRA data dump from November 2021.

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

### Automatic (preferred)

This website is automatically deployed via a GitHub action whenever code is pushed to the main branch.

### Manual

One time:

```bash
git remote add dokku dokku@tisdk.com:jira-archive
```

Then to release:

```bash
git push dokku main
```

## Note

On the server, you need to run this one-time so npm doesn't prune dev dependencies and break the deployment:

```bash
dokku config:set jira-archive NPM_CONFIG_PRODUCTION=false
```
