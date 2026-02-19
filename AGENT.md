# Akeneo PIM CLI - AI Agent Guide

This CLI provides programmatic access to the Akeneo Product Information Management (PIM) API.

## Quick Start for AI Agents

```bash
akeneo config set --client-id YOUR_CLIENT_ID --client-secret YOUR_CLIENT_SECRET \
  --username YOUR_USERNAME --password YOUR_PASSWORD
akeneo config set --base-url https://your-instance.akeneo.com/api/rest/v1
akeneo products list
```

## Available Commands

### config
- `akeneo config set --client-id <id> --client-secret <secret> --username <user> --password <pass>` - Set credentials
- `akeneo config set --base-url <url>` - Set API base URL
- `akeneo config get <key>` - Get a config value
- `akeneo config list` - List all config values

### products
- `akeneo products list` - List products
- `akeneo products list --limit <n>` - List with limit
- `akeneo products get <identifier>` - Get product details
- `akeneo products create --identifier <sku> --family <family>` - Create a product

### categories
- `akeneo categories list` - List categories
- `akeneo categories get <code>` - Get category details
- `akeneo categories create --code <code> --labels <json>` - Create a category

### attributes
- `akeneo attributes list` - List attributes
- `akeneo attributes list --type <type>` - List by type
- `akeneo attributes get <code>` - Get attribute details
- `akeneo attributes create --code <code> --type <type>` - Create attribute

## Output Format

All commands output formatted tables by default. Use `--json` flag for machine-readable JSON output.

## Authentication

This CLI uses Akeneo's OAuth2 password grant flow. You need client credentials from your Akeneo PIM instance
(Settings > API Connections) plus a valid username and password.
Access tokens are automatically refreshed when they expire.
