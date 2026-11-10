import { buildCatalog, siteConfig, writeCatalogArtifacts } from './lib/catalog-build';

const root = process.cwd();
const { siteUrl, absoluteBase } = siteConfig();

try {
  const catalog = buildCatalog(root, siteUrl);
  writeCatalogArtifacts(root, catalog, absoluteBase);
  console.info(
    `[catalog] ${catalog.stats.totalChannels} channels, ${catalog.stats.sources} sources, ` +
      `${catalog.stats.verifiedChannels} verified, ${catalog.stats.countries} countries.`,
  );
  console.info(`[catalog] wrote public/data/catalog.json, sitemap.xml and robots.txt`);
} catch (error) {
  console.error('[catalog] failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
