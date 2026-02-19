import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getConfig, setConfig, isConfigured, getAllConfig } from './config.js';
import {
  listProducts, getProduct, createProduct,
  listCategories, getCategory, createCategory,
  listAttributes, getAttribute, createAttribute
} from './api.js';

const program = new Command();

// ============================================================
// Helpers
// ============================================================

function printSuccess(message) {
  console.log(chalk.green('✓') + ' ' + message);
}

function printError(message) {
  console.error(chalk.red('✗') + ' ' + message);
}

function printTable(data, columns) {
  if (!data || data.length === 0) {
    console.log(chalk.yellow('No results found.'));
    return;
  }
  const widths = {};
  columns.forEach(col => {
    widths[col.key] = col.label.length;
    data.forEach(row => {
      const val = String(col.format ? col.format(row[col.key], row) : (row[col.key] ?? ''));
      if (val.length > widths[col.key]) widths[col.key] = val.length;
    });
    widths[col.key] = Math.min(widths[col.key], 45);
  });
  const header = columns.map(col => col.label.padEnd(widths[col.key])).join('  ');
  console.log(chalk.bold(chalk.cyan(header)));
  console.log(chalk.dim('─'.repeat(header.length)));
  data.forEach(row => {
    const line = columns.map(col => {
      const val = String(col.format ? col.format(row[col.key], row) : (row[col.key] ?? ''));
      return val.substring(0, widths[col.key]).padEnd(widths[col.key]);
    }).join('  ');
    console.log(line);
  });
  console.log(chalk.dim(`\n${data.length} result(s)`));
}

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

async function withSpinner(message, fn) {
  const spinner = ora(message).start();
  try {
    const result = await fn();
    spinner.stop();
    return result;
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

function requireAuth() {
  if (!isConfigured()) {
    printError('Akeneo credentials not configured.');
    console.log('\nRun the following to configure:');
    console.log(chalk.cyan('  akeneo config set --client-id <id> --client-secret <secret> --username <user> --password <pass>'));
    console.log(chalk.cyan('  akeneo config set --base-url https://your-akeneo-instance.com/api/rest/v1'));
    process.exit(1);
  }
}

// ============================================================
// Program metadata
// ============================================================

program
  .name('akeneo')
  .description(chalk.bold('Akeneo PIM CLI') + ' - Product information management from your terminal')
  .version('1.0.0');

// ============================================================
// CONFIG
// ============================================================

const configCmd = program.command('config').description('Manage CLI configuration');

configCmd
  .command('set')
  .description('Set configuration values')
  .option('--client-id <id>', 'Akeneo OAuth2 client ID')
  .option('--client-secret <secret>', 'Akeneo OAuth2 client secret')
  .option('--username <user>', 'Akeneo username')
  .option('--password <pass>', 'Akeneo password')
  .option('--base-url <url>', 'Akeneo API base URL (default: https://demo.akeneo.com/api/rest/v1)')
  .action((options) => {
    if (options.clientId) { setConfig('clientId', options.clientId); printSuccess('Client ID set'); }
    if (options.clientSecret) { setConfig('clientSecret', options.clientSecret); printSuccess('Client secret set'); }
    if (options.username) { setConfig('username', options.username); printSuccess(`Username set: ${options.username}`); }
    if (options.password) { setConfig('password', options.password); printSuccess('Password set'); }
    if (options.baseUrl) { setConfig('baseUrl', options.baseUrl); printSuccess(`Base URL set: ${options.baseUrl}`); }
    if (!options.clientId && !options.clientSecret && !options.username && !options.password && !options.baseUrl) {
      printError('No options provided. Use --client-id, --client-secret, --username, --password, or --base-url');
    }
  });

configCmd
  .command('get <key>')
  .description('Get a configuration value')
  .action((key) => {
    const value = getConfig(key);
    if (value === undefined) {
      printError(`Key "${key}" not found`);
    } else {
      const sensitive = ['clientSecret', 'password', 'accessToken'];
      console.log(sensitive.includes(key) ? '****' : value);
    }
  });

configCmd
  .command('list')
  .description('List all configuration values')
  .action(() => {
    const all = getAllConfig();
    console.log(chalk.bold('\nAkeneo PIM CLI Configuration\n'));
    console.log('Client ID:     ', all.clientId ? chalk.green(all.clientId) : chalk.red('not set'));
    console.log('Client Secret: ', all.clientSecret ? chalk.green('****') : chalk.red('not set'));
    console.log('Username:      ', all.username ? chalk.green(all.username) : chalk.red('not set'));
    console.log('Password:      ', all.password ? chalk.green('****') : chalk.red('not set'));
    console.log('Base URL:      ', all.baseUrl ? chalk.green(all.baseUrl) : chalk.yellow('using default: https://demo.akeneo.com/api/rest/v1'));
    console.log('');
  });

// ============================================================
// PRODUCTS
// ============================================================

const productsCmd = program.command('products').description('Manage PIM products');

productsCmd
  .command('list')
  .description('List products')
  .option('--limit <n>', 'Maximum number of results', '20')
  .option('--page <n>', 'Page number', '1')
  .option('--search <query>', 'Search filter (JSON format)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();
    try {
      const products = await withSpinner('Fetching products...', () =>
        listProducts({ limit: parseInt(options.limit), page: parseInt(options.page), search: options.search })
      );
      if (options.json) { printJson(products); return; }
      printTable(products, [
        { key: 'identifier', label: 'Identifier' },
        { key: 'family', label: 'Family' },
        { key: 'enabled', label: 'Enabled', format: (v) => v ? chalk.green('Yes') : chalk.red('No') },
        { key: 'categories', label: 'Categories', format: (v) => Array.isArray(v) ? v.join(', ') : v || 'N/A' },
        { key: 'created', label: 'Created', format: (v) => v ? v.substring(0, 10) : 'N/A' },
        { key: 'updated', label: 'Updated', format: (v) => v ? v.substring(0, 10) : 'N/A' }
      ]);
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

productsCmd
  .command('get <identifier>')
  .description('Get details of a specific product')
  .option('--json', 'Output as JSON')
  .action(async (identifier, options) => {
    requireAuth();
    try {
      const product = await withSpinner('Fetching product...', () => getProduct(identifier));
      if (options.json) { printJson(product); return; }
      console.log(chalk.bold('\nProduct Details\n'));
      console.log('Identifier:  ', chalk.cyan(product.identifier));
      console.log('Family:      ', product.family || 'N/A');
      console.log('Enabled:     ', product.enabled ? chalk.green('Yes') : chalk.red('No'));
      console.log('Categories:  ', Array.isArray(product.categories) ? product.categories.join(', ') : 'N/A');
      console.log('Groups:      ', Array.isArray(product.groups) ? product.groups.join(', ') : 'N/A');
      console.log('Created:     ', product.created || 'N/A');
      console.log('Updated:     ', product.updated || 'N/A');
      if (product.values && Object.keys(product.values).length > 0) {
        console.log(chalk.bold('\nAttributes (first 10):\n'));
        const entries = Object.entries(product.values).slice(0, 10);
        entries.forEach(([attr, vals]) => {
          const firstVal = vals?.[0];
          const displayVal = firstVal?.data !== undefined ?
            (typeof firstVal.data === 'object' ? JSON.stringify(firstVal.data) : String(firstVal.data)) : 'N/A';
          console.log(`  ${chalk.cyan(attr.padEnd(25))} ${displayVal.substring(0, 50)}`);
        });
      }
      console.log('');
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

productsCmd
  .command('create')
  .description('Create a new product')
  .requiredOption('--identifier <id>', 'Product identifier (SKU)')
  .option('--family <family>', 'Product family code')
  .option('--categories <cats>', 'Comma-separated category codes')
  .option('--values <json>', 'Product attribute values as JSON')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();
    let values;
    if (options.values) {
      try { values = JSON.parse(options.values); } catch {
        printError('Invalid JSON for --values'); process.exit(1);
      }
    }
    const categories = options.categories ? options.categories.split(',').map(c => c.trim()) : undefined;
    try {
      const product = await withSpinner('Creating product...', () =>
        createProduct({ identifier: options.identifier, family: options.family, categories, values })
      );
      if (options.json) { printJson(product); return; }
      printSuccess(`Product created: ${chalk.bold(options.identifier)}`);
      if (options.family) console.log('Family: ', options.family);
      if (categories) console.log('Categories: ', categories.join(', '));
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

// ============================================================
// CATEGORIES
// ============================================================

const categoriesCmd = program.command('categories').description('Manage PIM categories');

categoriesCmd
  .command('list')
  .description('List categories')
  .option('--limit <n>', 'Maximum number of results', '20')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();
    try {
      const categories = await withSpinner('Fetching categories...', () =>
        listCategories({ limit: parseInt(options.limit) })
      );
      if (options.json) { printJson(categories); return; }
      printTable(categories, [
        { key: 'code', label: 'Code' },
        { key: 'parent', label: 'Parent', format: (v) => v || '(root)' },
        { key: 'labels', label: 'Label (en)', format: (v) => v?.en_US || Object.values(v || {})[0] || 'N/A' }
      ]);
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

categoriesCmd
  .command('get <code>')
  .description('Get details of a specific category')
  .option('--json', 'Output as JSON')
  .action(async (code, options) => {
    requireAuth();
    try {
      const category = await withSpinner('Fetching category...', () => getCategory(code));
      if (options.json) { printJson(category); return; }
      console.log(chalk.bold('\nCategory Details\n'));
      console.log('Code:   ', chalk.cyan(category.code));
      console.log('Parent: ', category.parent || '(root)');
      if (category.labels) {
        console.log('Labels:');
        Object.entries(category.labels).forEach(([locale, label]) => {
          console.log(`  ${locale}: ${label}`);
        });
      }
      console.log('');
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

categoriesCmd
  .command('create')
  .description('Create a new category')
  .requiredOption('--code <code>', 'Category code')
  .option('--parent <parent>', 'Parent category code')
  .option('--labels <json>', 'Labels as JSON, e.g. \'{"en_US":"Electronics","fr_FR":"Électronique"}\'')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();
    let labels;
    if (options.labels) {
      try { labels = JSON.parse(options.labels); } catch {
        printError('Invalid JSON for --labels'); process.exit(1);
      }
    }
    try {
      const category = await withSpinner('Creating category...', () =>
        createCategory({ code: options.code, parent: options.parent, labels })
      );
      if (options.json) { printJson(category); return; }
      printSuccess(`Category created: ${chalk.bold(options.code)}`);
      if (options.parent) console.log('Parent: ', options.parent);
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

// ============================================================
// ATTRIBUTES
// ============================================================

const attributesCmd = program.command('attributes').description('Manage PIM attributes');

attributesCmd
  .command('list')
  .description('List attributes')
  .option('--limit <n>', 'Maximum number of results', '20')
  .option('--type <type>', 'Filter by attribute type (pim_catalog_text|pim_catalog_number|pim_catalog_boolean|etc)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();
    try {
      const attributes = await withSpinner('Fetching attributes...', () =>
        listAttributes({ limit: parseInt(options.limit), type: options.type })
      );
      if (options.json) { printJson(attributes); return; }
      printTable(attributes, [
        { key: 'code', label: 'Code' },
        { key: 'type', label: 'Type' },
        { key: 'group', label: 'Group' },
        { key: 'localizable', label: 'Localizable', format: (v) => v ? 'Yes' : 'No' },
        { key: 'scopable', label: 'Scopable', format: (v) => v ? 'Yes' : 'No' },
        { key: 'labels', label: 'Label (en)', format: (v) => v?.en_US || Object.values(v || {})[0] || 'N/A' }
      ]);
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

attributesCmd
  .command('get <code>')
  .description('Get details of a specific attribute')
  .option('--json', 'Output as JSON')
  .action(async (code, options) => {
    requireAuth();
    try {
      const attr = await withSpinner('Fetching attribute...', () => getAttribute(code));
      if (options.json) { printJson(attr); return; }
      console.log(chalk.bold('\nAttribute Details\n'));
      console.log('Code:        ', chalk.cyan(attr.code));
      console.log('Type:        ', chalk.bold(attr.type));
      console.log('Group:       ', attr.group || 'N/A');
      console.log('Localizable: ', attr.localizable ? chalk.green('Yes') : 'No');
      console.log('Scopable:    ', attr.scopable ? chalk.green('Yes') : 'No');
      console.log('Unique:      ', attr.unique ? chalk.yellow('Yes') : 'No');
      console.log('Required:    ', attr.is_required ? chalk.yellow('Yes') : 'No');
      if (attr.labels) {
        console.log('Labels:');
        Object.entries(attr.labels).forEach(([locale, label]) => {
          console.log(`  ${locale}: ${label}`);
        });
      }
      console.log('');
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

attributesCmd
  .command('create')
  .description('Create a new attribute')
  .requiredOption('--code <code>', 'Attribute code')
  .requiredOption('--type <type>', 'Attribute type (pim_catalog_text|pim_catalog_number|pim_catalog_boolean|pim_catalog_textarea|pim_catalog_simpleselect|pim_catalog_multiselect|pim_catalog_date|pim_catalog_file|pim_catalog_image|pim_catalog_price_collection|pim_catalog_metric)')
  .option('--group <group>', 'Attribute group code', 'other')
  .option('--localizable', 'Make attribute localizable')
  .option('--scopable', 'Make attribute scopable')
  .option('--labels <json>', 'Labels as JSON, e.g. \'{"en_US":"Color","fr_FR":"Couleur"}\'')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();
    let labels;
    if (options.labels) {
      try { labels = JSON.parse(options.labels); } catch {
        printError('Invalid JSON for --labels'); process.exit(1);
      }
    }
    try {
      const attr = await withSpinner('Creating attribute...', () =>
        createAttribute({
          code: options.code,
          type: options.type,
          group: options.group,
          localizable: !!options.localizable,
          scopable: !!options.scopable,
          labels
        })
      );
      if (options.json) { printJson(attr); return; }
      printSuccess(`Attribute created: ${chalk.bold(options.code)}`);
      console.log('Type:  ', options.type);
      console.log('Group: ', options.group);
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

// ============================================================
// Parse
// ============================================================

program.parse(process.argv);

if (process.argv.length <= 2) {
  program.help();
}
