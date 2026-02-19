> "Six months ago, everyone was talking about MCPs. And I was like, screw MCPs. Every MCP would be better as a CLI."
>
> — [Peter Steinberger](https://twitter.com/steipete), Founder of OpenClaw
> [Watch on YouTube (~2:39:00)](https://www.youtube.com/@lexfridman) | [Lex Fridman Podcast #491](https://lexfridman.com/peter-steinberger/)

# Akeneo PIM CLI

Production-ready CLI for Akeneo PIM (Product Information Management) API.

## Installation

```bash
npm install -g @ktmcp-cli/akeneo
```

## Configuration

```bash
akeneo config set --client-id YOUR_CLIENT_ID \
  --client-secret YOUR_CLIENT_SECRET \
  --username YOUR_USERNAME \
  --password YOUR_PASSWORD
akeneo config set --base-url https://your-akeneo-instance.com/api/rest/v1
```

Get API credentials from your Akeneo PIM instance under Settings > API Connections.

## Usage

### Products

```bash
# List products
akeneo products list
akeneo products list --limit 50

# Get product details
akeneo products get my-product-sku

# Create a product
akeneo products create --identifier new-sku-001 \
  --family clothing \
  --categories "summer,t-shirts" \
  --values '{"name":[{"locale":"en_US","scope":null,"data":"My Product"}]}'
```

### Categories

```bash
# List categories
akeneo categories list
akeneo categories list --limit 100

# Get category details
akeneo categories get electronics

# Create a category
akeneo categories create --code summer-collection \
  --parent clothing \
  --labels '{"en_US":"Summer Collection","fr_FR":"Collection Été"}'
```

### Attributes

```bash
# List attributes
akeneo attributes list
akeneo attributes list --type pim_catalog_text

# Get attribute details
akeneo attributes get color

# Create an attribute
akeneo attributes create \
  --code material \
  --type pim_catalog_text \
  --group product_info \
  --localizable \
  --labels '{"en_US":"Material","fr_FR":"Matériau"}'
```

### Configuration

```bash
akeneo config set --client-id <id>
akeneo config get username
akeneo config list
```

## Attribute Types

- `pim_catalog_text` - Single-line text
- `pim_catalog_textarea` - Multi-line text
- `pim_catalog_number` - Numeric value
- `pim_catalog_boolean` - Yes/No toggle
- `pim_catalog_simpleselect` - Single choice from options
- `pim_catalog_multiselect` - Multiple choices
- `pim_catalog_date` - Date picker
- `pim_catalog_image` - Image file
- `pim_catalog_price_collection` - Price in multiple currencies
- `pim_catalog_metric` - Measurement with unit

## JSON Output

All commands support `--json` flag for machine-readable output:

```bash
akeneo products list --json
akeneo attributes get color --json
```

## License

MIT
