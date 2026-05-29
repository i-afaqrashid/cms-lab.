import { createDiagnostic, summarizeDiagnostics } from "./diagnostics.js";
import { evaluateCustomRules } from "./custom-rules.js";
import { readCmsDataPath } from "./data-path.js";
import { SiteUnreachableError } from "./errors.js";
import type {
  CMSDocument,
  CheckGroup,
  CmsLabConfig,
  Diagnostic,
  DiagnosticGroupSummary,
  FetchLike,
  ProjectInfo,
  RelationshipRule,
  RequiredFieldRule,
  RouteChecksOptions,
  RouteDefinition,
  ScanFilters,
  ScanResult,
} from "./types.js";

export type ScanDocumentsOptions = {
  config: CmsLabConfig;
  project: ProjectInfo;
  documents: CMSDocument[];
  fetch?: FetchLike;
  timeoutMs?: number;
  concurrency?: number;
  retries?: number;
  filters?: ScanFilters;
  /**
   * Optional sleep used between retry attempts. Defaults to setTimeout.
   * Useful for tests that need to assert backoff timing without waiting.
   */
  sleep?: (ms: number) => Promise<void>;
  /**
   * Reference time for custom rule date assertions. Defaults to Date.now().
   * Useful for deterministic tests of relative-date rules.
   */
  now?: number;
};

const MAX_BACKOFF_MS = 8_000;
const MAX_RETRY_AFTER_MS = 30_000;
const BASE_BACKOFF_MS = 250;
const MAX_JITTER_MS = 250;

type RouteCandidate = {
  document: CMSDocument;
  route: RouteDefinition;
  path: string;
};

export async function scanDocuments(
  options: ScanDocumentsOptions,
): Promise<ScanResult> {
  const fetchImpl = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 5000;
  const concurrency = normalizeConcurrency(options.concurrency);
  const retries = normalizeRetries(options.retries);
  const sleep = options.sleep ?? defaultSleep;
  const documents = filterDocuments(options.documents, options.filters);
  const diagnostics: Diagnostic[] = [];

  await assertSiteReachable(
    resolveSiteHealthUrl(options.config.site).toString(),
    fetchImpl,
    timeoutMs,
    retries,
    sleep,
  );

  const shouldRunRoutes = shouldRunCheck(
    "routes",
    options.config,
    options.filters,
  );
  const routeCandidates = shouldRunRoutes
    ? resolveRouteCandidates(options.config, documents, diagnostics)
    : [];

  if (shouldRunRoutes) {
    diagnostics.push(...detectDuplicateRoutes(options.config, routeCandidates));
    diagnostics.push(
      ...(await checkRouteReachability(
        options.config,
        routeCandidates,
        fetchImpl,
        timeoutMs,
        concurrency,
        retries,
        sleep,
      )),
    );
  }

  if (shouldRunCheck("seo", options.config, options.filters)) {
    diagnostics.push(...checkSeoFields(options.config, documents));
  }

  if (shouldRunImageAltTextCheck(options.config, options.filters)) {
    diagnostics.push(...checkImageAltText(options.config, documents));
  }

  if (shouldRunCheck("fields", options.config, options.filters)) {
    diagnostics.push(...checkRequiredFields(options.config, documents));
  }

  if (shouldRunCheck("relationships", options.config, options.filters)) {
    diagnostics.push(...checkRelationships(options.config, documents));
  }

  if (shouldRunCheck("custom", options.config, options.filters)) {
    diagnostics.push(
      ...evaluateCustomRules(options.config, documents, { now: options.now }),
    );
  }

  return {
    project: options.project,
    documents,
    diagnostics,
    diagnosticGroups: summarizeDiagnosticGroups(
      diagnostics,
      options.config,
      routeCandidates,
    ),
    summary: summarizeDiagnostics(diagnostics),
  };
}

function resolveRouteCandidates(
  config: CmsLabConfig,
  documents: CMSDocument[],
  diagnostics: Diagnostic[],
): RouteCandidate[] {
  const candidates: RouteCandidate[] = [];

  for (const document of documents) {
    const route = config.routes.find(
      (candidate) => candidate.type === document.type,
    );
    if (!route) {
      if (document.routable === false) {
        continue;
      }

      diagnostics.push(
        createDiagnostic({
          severity: "info",
          code: "CMS-ROUTE-UNMAPPED",
          message: `Document ${document.id} of type ${document.type} has no configured route mapping`,
          source: sourceFor(config, document),
        }),
      );
      continue;
    }

    if (route.pattern.includes(":uid") && !document.uid) {
      diagnostics.push(
        createDiagnostic({
          severity: "error",
          code: "CMS-UID-MISSING",
          message: `Document ${document.id} of type ${document.type} is missing uid`,
          source: sourceFor(config, document),
        }),
      );
      continue;
    }

    try {
      const path = route.getPath(document);
      if (!path || !isSiteRelativePath(path)) {
        diagnostics.push(
          createDiagnostic({
            severity: "error",
            code: "CMS-ROUTE-INVALID",
            message: `Route for document ${document.id} must resolve to a same-origin path starting with a single /`,
            source: sourceFor(config, document),
          }),
        );
        continue;
      }

      candidates.push({ document, route, path });
    } catch (error) {
      diagnostics.push(
        createDiagnostic({
          severity: "error",
          code: "CMS-ROUTE-RESOLVE",
          message: messageFrom(
            error instanceof Error
              ? error
              : `Failed to resolve route for document ${document.id}`,
          ),
          source: sourceFor(config, document),
        }),
      );
    }
  }

  return candidates;
}

/**
 * Flag two or more published documents that resolve to the same route path.
 * Only one wins at runtime, so the others are silent content debt. Draft
 * documents are skipped: a draft sharing a path with a published document is
 * expected (only the published one is live). The first candidate for a path
 * (in document order) is treated as the winner; the rest are reported.
 */
function detectDuplicateRoutes(
  config: CmsLabConfig,
  candidates: RouteCandidate[],
): Diagnostic[] {
  const byPath = new Map<string, RouteCandidate[]>();

  for (const candidate of candidates) {
    if (candidate.document.status === "draft") {
      continue;
    }

    const key = duplicateRouteKey(candidate.path);
    byPath.set(key, [...(byPath.get(key) ?? []), candidate]);
  }

  const diagnostics: Diagnostic[] = [];

  for (const group of byPath.values()) {
    if (group.length < 2) {
      continue;
    }

    const [winner, ...losers] = group;
    for (const loser of losers) {
      diagnostics.push(
        createDiagnostic({
          severity: "error",
          code: "CMS-ROUTE-DUPLICATE",
          message: `Document ${loser.document.id} of type ${loser.document.type} resolves to ${pathForDiagnostic(loser.path)}, which is already used by document ${winner.document.id} of type ${winner.document.type}`,
          path: pathForDiagnostic(loser.path),
          source: sourceFor(config, loser.document),
        }),
      );
    }
  }

  return diagnostics;
}

function duplicateRouteKey(path: string): string {
  try {
    const pathname = new URL(path, "https://cms-lab.local").pathname.replace(
      /\/+$/,
      "",
    );
    return pathname || "/";
  } catch {
    return path;
  }
}

async function checkRouteReachability(
  config: CmsLabConfig,
  candidates: RouteCandidate[],
  fetchImpl: FetchLike,
  timeoutMs: number,
  concurrency: number,
  retries: number,
  sleep: (ms: number) => Promise<void>,
): Promise<Diagnostic[]> {
  const results = await mapLimit(candidates, concurrency, async (candidate) => {
    const diagnostics: Diagnostic[] = [];
    const siteUrl = new URL(config.site.url);
    const url = resolveSiteRouteUrl(siteUrl, candidate.path);
    const diagnosticPath = pathForDiagnostic(candidate.path);
    let response: Response;

    if (url.origin !== siteUrl.origin) {
      diagnostics.push(
        createDiagnostic({
          severity: "error",
          code: "CMS-ROUTE-INVALID",
          message: `Route ${diagnosticPath} resolved outside configured site origin`,
          path: diagnosticPath,
          source: sourceFor(config, candidate.document),
        }),
      );
      return diagnostics;
    }

    try {
      response = await fetchWithRetries(
        fetchImpl,
        url,
        timeoutMs,
        retries,
        sleep,
      );
    } catch (error) {
      diagnostics.push(
        createDiagnostic({
          severity: "error",
          code: "CMS-ROUTE-ERROR",
          message: `Route ${diagnosticPath} could not be fetched: ${messageFrom(error)}`,
          path: diagnosticPath,
          source: sourceFor(config, candidate.document),
        }),
      );
      return diagnostics;
    }

    const status = response.status;

    if (status === 404) {
      diagnostics.push(
        createDiagnostic({
          severity: "error",
          code: "CMS-ROUTE-404",
          message: `Route ${diagnosticPath} returned 404`,
          path: diagnosticPath,
          source: sourceFor(config, candidate.document),
        }),
      );
      return diagnostics;
    }

    if (status >= 500) {
      diagnostics.push(
        createDiagnostic({
          severity: "error",
          code: "CMS-ROUTE-500",
          message: `Route ${diagnosticPath} returned ${status}`,
          path: diagnosticPath,
          source: sourceFor(config, candidate.document),
        }),
      );
      return diagnostics;
    }

    if (status >= 400) {
      diagnostics.push(
        createDiagnostic({
          severity: "error",
          code: "CMS-ROUTE-ERROR",
          message: `Route ${diagnosticPath} returned ${status}`,
          path: diagnosticPath,
          source: sourceFor(config, candidate.document),
        }),
      );
      return diagnostics;
    }

    // Soft-404 detection: 2xx responses whose body looks like a not-found
    // page (common Next.js / framework fallback shape). Only runs when
    // explicitly enabled via checks.routes.soft404.
    const soft404 = soft404Options(config);
    if (soft404 && status >= 200 && status < 300) {
      try {
        const body = await response.text();
        if (matchesSoft404Body(body, soft404)) {
          diagnostics.push(
            createDiagnostic({
              severity: "warning",
              code: "CMS-ROUTE-SOFT-404",
              message: `Route ${diagnosticPath} returned ${status} but the body looks like a not-found page`,
              path: diagnosticPath,
              source: sourceFor(config, candidate.document),
            }),
          );
        }
      } catch {
        // Body read errors are not actionable here; leave as silent.
      }
    }

    return diagnostics;
  });

  return results.flat();
}

function soft404Options(
  config: CmsLabConfig,
): NonNullable<RouteChecksOptions["soft404"]> | undefined {
  const routes = config.checks?.routes;
  if (typeof routes !== "object" || routes === null) {
    return undefined;
  }
  return routes.soft404;
}

function matchesSoft404Body(
  body: string,
  soft404: NonNullable<RouteChecksOptions["soft404"]>,
): boolean {
  if (soft404.strings && soft404.strings.length > 0) {
    const lower = body.toLowerCase();
    if (
      soft404.strings.some((needle) => lower.includes(needle.toLowerCase()))
    ) {
      return true;
    }
  }

  if (soft404.titlePattern) {
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(body);
    if (titleMatch) {
      const pattern = new RegExp(soft404.titlePattern, "i");
      if (pattern.test(titleMatch[1] ?? "")) {
        return true;
      }
    }
  }

  return false;
}

export function resolveSiteHealthUrl(site: CmsLabConfig["site"]): URL {
  if (site.healthUrl) {
    return new URL(site.healthUrl);
  }

  const siteUrl = new URL(site.url);
  if (site.healthPath) {
    return resolveSiteRouteUrl(siteUrl, site.healthPath);
  }

  return siteUrl;
}

function resolveSiteRouteUrl(siteUrl: URL, path: string): URL {
  const url = new URL(path, siteUrl);
  if (!url.search && siteUrl.search) {
    url.search = siteUrl.search;
  }

  return url;
}

async function assertSiteReachable(
  siteUrl: string,
  fetchImpl: FetchLike,
  timeoutMs: number,
  retries: number,
  sleep: (ms: number) => Promise<void>,
): Promise<void> {
  try {
    const response = await fetchWithRetries(
      fetchImpl,
      new URL(siteUrl),
      timeoutMs,
      retries,
      sleep,
    );
    if (!response.ok) {
      throw new SiteUnreachableError(
        `Site ${siteUrlForDiagnostic(siteUrl)} returned HTTP ${response.status}`,
      );
    }
  } catch (error) {
    if (error instanceof SiteUnreachableError) {
      throw error;
    }

    throw new SiteUnreachableError(
      error instanceof Error
        ? messageFrom(error)
        : `Site ${siteUrlForDiagnostic(siteUrl)} is unreachable`,
    );
  }
}

async function fetchWithTimeout(
  fetchImpl: FetchLike,
  url: URL,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, { method: "GET", signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithRetries(
  fetchImpl: FetchLike,
  url: URL,
  timeoutMs: number,
  retries: number,
  sleep: (ms: number) => Promise<void>,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(fetchImpl, url, timeoutMs);
      if (attempt < retries && isRetryableStatus(response.status)) {
        await sleep(retryDelayMs(attempt, response));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt >= retries) {
        break;
      }
      await sleep(retryDelayMs(attempt));
    }
  }

  throw lastError;
}

export function retryDelayMs(attempt: number, response?: Response): number {
  if (response) {
    const retryAfter = response.headers.get("retry-after");
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (Number.isFinite(seconds) && seconds >= 0) {
        return clamp(seconds * 1000, 0, MAX_RETRY_AFTER_MS);
      }

      const dateMs = Date.parse(retryAfter);
      if (!Number.isNaN(dateMs)) {
        const wait = dateMs - Date.now();
        if (wait > 0) {
          return Math.min(wait, MAX_RETRY_AFTER_MS);
        }
      }
    }
  }

  const safeAttempt = Math.max(0, attempt);
  const exponent = Math.min(safeAttempt, 30);
  const base = BASE_BACKOFF_MS * 2 ** exponent;
  const jitter = Math.floor(Math.random() * MAX_JITTER_MS);
  return Math.min(base + jitter, MAX_BACKOFF_MS);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function defaultSleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkSeoFields(
  config: CmsLabConfig,
  documents: CMSDocument[],
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const seo = config.checks?.seo;
  const checkMetaTitle =
    typeof seo === "object" ? seo.metaTitle !== false : true;
  const checkMetaDescription =
    typeof seo === "object" ? seo.metaDescription !== false : true;

  for (const document of documents) {
    const data = asRecord(document.data);
    if (!data) {
      continue;
    }

    const missing: string[] = [];
    if (checkMetaTitle && !hasSeoValue(config, data, "title")) {
      missing.push("meta_title");
    }
    if (checkMetaDescription && !hasSeoValue(config, data, "description")) {
      missing.push("meta_description");
    }

    if (missing.length > 0) {
      diagnostics.push(
        createDiagnostic({
          severity: "warning",
          code: "SEO-META-MISSING",
          message: `Document ${document.id} is missing ${missing.join(", ")}`,
          source: sourceFor(config, document),
        }),
      );
    }

    diagnostics.push(...checkOgFields(config, document, data));
  }

  return diagnostics;
}

type OgOptions = {
  image: boolean;
  title: boolean;
  description: boolean;
  twitter: boolean;
};

function resolveOgOptions(config: CmsLabConfig): OgOptions | undefined {
  const seo = config.checks?.seo;
  if (typeof seo !== "object" || seo === null) {
    return undefined;
  }

  const og = seo.og;
  if (og === undefined || og === false) {
    return undefined;
  }

  if (og === true) {
    return { image: true, title: false, description: false, twitter: false };
  }

  return {
    image: og.image !== false,
    title: og.title === true,
    description: og.description === true,
    twitter: og.twitter === true,
  };
}

function checkOgFields(
  config: CmsLabConfig,
  document: CMSDocument,
  data: Record<string, unknown>,
): Diagnostic[] {
  const options = resolveOgOptions(config);
  if (!options) {
    return [];
  }

  const provider = config.cms.provider;
  const diagnostics: Diagnostic[] = [];

  if (options.image && !hasImageReference(data, ogImagePaths(provider))) {
    diagnostics.push(
      createDiagnostic({
        severity: "warning",
        code: "SEO-OG-IMAGE-MISSING",
        message: `Document ${document.id} is missing an Open Graph image (og:image)`,
        source: sourceFor(config, document),
      }),
    );
  }

  const missingText: string[] = [];
  if (options.title && isBlankSeoText(data, ogFieldPaths("title"))) {
    missingText.push("og:title");
  }
  if (
    options.description &&
    isBlankSeoText(data, ogFieldPaths("description"))
  ) {
    missingText.push("og:description");
  }
  if (missingText.length > 0) {
    diagnostics.push(
      createDiagnostic({
        severity: "warning",
        code: "SEO-OG-MISSING",
        message: `Document ${document.id} is missing ${missingText.join(", ")}`,
        source: sourceFor(config, document),
      }),
    );
  }

  if (options.twitter && !hasImageReference(data, twitterImagePaths())) {
    diagnostics.push(
      createDiagnostic({
        severity: "info",
        code: "SEO-TWITTER-MISSING",
        message: `Document ${document.id} is missing an X (Twitter) card image (twitter:image)`,
        source: sourceFor(config, document),
      }),
    );
  }

  return diagnostics;
}

function isBlankSeoText(
  data: Record<string, unknown>,
  paths: string[],
): boolean {
  return !paths.some((path) => !isBlank(readCmsDataPath(data, path)));
}

/**
 * An image reference counts as present when a field path holds a non-empty
 * string URL, or an object/array that looks like a CMS asset reference
 * (url, src, asset, _ref, filename, source_url). This avoids false positives
 * for providers that store images as objects rather than plain URLs.
 */
function hasImageReference(
  data: Record<string, unknown>,
  paths: string[],
): boolean {
  return paths.some((path) => isUsableImageRef(readCmsDataPath(data, path)));
}

function isUsableImageRef(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.some((item) => isUsableImageRef(item));
  }

  const record = asRecord(value);
  if (!record) {
    return false;
  }

  if (
    ["url", "src", "source_url", "filename", "_ref", "_id"].some(
      (key) => typeof record[key] === "string" && record[key].trim().length > 0,
    )
  ) {
    return true;
  }

  const asset = asRecord(record.asset);
  return Boolean(asset && (asset._ref || asset._id || asset.url));
}

function ogImagePaths(provider: CmsLabConfig["cms"]["provider"]): string[] {
  const common = [
    "og_image",
    "ogImage",
    "og.image",
    "openGraph.image",
    "openGraphImage",
    "seo.ogImage",
    "seo.og_image",
    "seo.openGraphImage",
    "seo.image",
    "seo.shareImage",
    "seo.metaImage",
    "meta.image",
    "meta.ogImage",
    "social.image",
    "shareImage",
    "share_image",
  ];

  if (provider === "wordpress") {
    return [...common, "yoast_head_json.og_image", "rank_math_facebook_image"];
  }

  return common;
}

function twitterImagePaths(): string[] {
  return [
    "twitter_image",
    "twitterImage",
    "twitter.image",
    "seo.twitterImage",
    "seo.twitter_image",
    "meta.twitterImage",
    "yoast_head_json.twitter_image",
  ];
}

function ogFieldPaths(kind: "title" | "description"): string[] {
  if (kind === "title") {
    return [
      "og_title",
      "ogTitle",
      "og.title",
      "openGraph.title",
      "seo.ogTitle",
      "meta.ogTitle",
    ];
  }

  return [
    "og_description",
    "ogDescription",
    "og.description",
    "openGraph.description",
    "seo.ogDescription",
    "meta.ogDescription",
  ];
}

function checkImageAltText(
  config: CmsLabConfig,
  documents: CMSDocument[],
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const document of documents) {
    const missingPaths = collectImagesMissingAlt(
      document.data,
      config.cms.provider,
    );

    for (const path of missingPaths) {
      diagnostics.push(
        createDiagnostic({
          severity: "warning",
          code: "A11Y-IMG-ALT",
          message: `Image field ${path} is missing useful alt text`,
          source: sourceFor(config, document),
        }),
      );
    }
  }

  return diagnostics;
}

function checkRequiredFields(
  config: CmsLabConfig,
  documents: CMSDocument[],
): Diagnostic[] {
  const rules = requiredFieldRules(config);
  if (rules.length === 0) {
    return [];
  }

  const diagnostics: Diagnostic[] = [];

  for (const document of documents) {
    for (const rule of rules) {
      if (rule.type !== document.type) {
        continue;
      }

      const fullPath = `data.${rule.path}`;
      if (!isMissingFieldValue(readCmsDataPath(document.data, rule.path))) {
        continue;
      }

      diagnostics.push(
        createDiagnostic({
          severity: rule.severity ?? "error",
          code: "CMS-FIELD-MISSING",
          message: `Document ${document.id} is missing required field ${fullPath}`,
          path: fullPath,
          source: sourceFor(config, document),
        }),
      );
    }
  }

  return diagnostics;
}

function requiredFieldRules(config: CmsLabConfig): RequiredFieldRule[] {
  const fields = config.checks?.fields;
  if (!fields || typeof fields === "boolean") {
    return [];
  }

  return fields.required ?? [];
}

function checkRelationships(
  config: CmsLabConfig,
  documents: CMSDocument[],
): Diagnostic[] {
  const rules = relationshipRules(config);
  if (rules.length === 0) {
    return [];
  }

  const documentsByType = new Map<string, CMSDocument[]>();
  for (const document of documents) {
    documentsByType.set(document.type, [
      ...(documentsByType.get(document.type) ?? []),
      document,
    ]);
  }

  const diagnostics: Diagnostic[] = [];

  for (const rule of rules) {
    const min = rule.min ?? 1;
    const targets = documentsByType.get(rule.to) ?? [];

    for (const document of documentsByType.get(rule.from) ?? []) {
      const fromValues = relationshipValues(document, rule.where.fromField);
      const matchCount = targets.filter((target) =>
        hasRelationshipMatch(
          fromValues,
          relationshipValues(target, rule.where.toField),
        ),
      ).length;

      if (matchCount >= min) {
        continue;
      }

      diagnostics.push(
        createDiagnostic({
          severity: rule.severity ?? "warning",
          code: "CMS-RELATIONSHIP-MISSING",
          message: `Document ${document.id} of type ${document.type} has ${matchCount} ${rule.to} records matching ${rule.where.fromField} -> ${rule.where.toField}; expected at least ${min}`,
          path: `relationships.${rule.from}.${rule.to}`,
          source: sourceFor(config, document),
        }),
      );
    }
  }

  return diagnostics;
}

function relationshipRules(config: CmsLabConfig): RelationshipRule[] {
  return config.checks?.relationships ?? [];
}

function summarizeDiagnosticGroups(
  diagnostics: Diagnostic[],
  config: CmsLabConfig,
  routeCandidates: RouteCandidate[],
): DiagnosticGroupSummary[] {
  const routePatternBySource = new Map(
    routeCandidates.map((candidate) => [
      sourceFor(config, candidate.document),
      candidate.route.pattern,
    ]),
  );
  const groups = new Map<string, DiagnosticGroupSummary>();

  for (const diagnostic of diagnostics) {
    const type = typeFromSource(diagnostic.source);
    const routePattern = routePatternForDiagnostic(
      diagnostic,
      type,
      config,
      routePatternBySource,
    );
    const key = diagnosticGroupKey(diagnostic, type, routePattern);
    const existing = groups.get(key);
    const example = diagnosticExample(diagnostic);

    if (existing) {
      existing.count += 1;
      if (example && !existing.examples.includes(example)) {
        existing.examples.push(example);
      }
      existing.examples = existing.examples.slice(0, 3);
      continue;
    }

    groups.set(key, {
      key,
      severity: diagnostic.severity,
      code: diagnostic.code,
      count: 1,
      ...(type ? { type } : {}),
      ...(routePattern ? { routePattern } : {}),
      label: diagnosticGroupLabel(type, routePattern),
      examples: example ? [example] : [],
    });
  }

  return [...groups.values()];
}

function routePatternForDiagnostic(
  diagnostic: Diagnostic,
  type: string | undefined,
  config: CmsLabConfig,
  routePatternBySource: Map<string, string>,
): string | undefined {
  if (
    !isRouteDiagnostic(diagnostic.code) &&
    diagnostic.code !== "CMS-UID-MISSING"
  ) {
    return undefined;
  }

  if (diagnostic.source) {
    const routePattern = routePatternBySource.get(diagnostic.source);
    if (routePattern) {
      return routePattern;
    }
  }

  return type
    ? config.routes.find((route) => route.type === type)?.pattern
    : undefined;
}

function isRouteDiagnostic(code: string): boolean {
  return code.startsWith("CMS-ROUTE");
}

function diagnosticGroupKey(
  diagnostic: Diagnostic,
  type: string | undefined,
  routePattern: string | undefined,
): string {
  return [diagnostic.severity, diagnostic.code, type, routePattern]
    .filter(Boolean)
    .join(":");
}

function diagnosticGroupLabel(
  type: string | undefined,
  routePattern: string | undefined,
): string {
  if (type && routePattern) {
    return `${type} ${routePattern}`;
  }

  return type ?? "project";
}

function diagnosticExample(diagnostic: Diagnostic): string | undefined {
  return diagnostic.path ?? diagnostic.source ?? diagnostic.message;
}

function typeFromSource(source: string | undefined): string | undefined {
  if (!source) {
    return undefined;
  }

  const match = /^[^:]+:([^#]+)#/.exec(source);
  return match?.[1];
}

function hasRelationshipMatch(
  fromValues: string[],
  toValues: string[],
): boolean {
  if (fromValues.length === 0 || toValues.length === 0) {
    return false;
  }

  const targetValues = new Set(toValues);
  return fromValues.some((value) => targetValues.has(value));
}

function relationshipValues(document: CMSDocument, path: string): string[] {
  const dataValue = readCmsDataPath(document.data, path);
  if (dataValue !== undefined) {
    return normalizeRelationshipValues(dataValue);
  }

  return normalizeRelationshipValues(
    (document as unknown as Record<string, unknown>)[path],
  );
}

function normalizeRelationshipValues(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeRelationshipValues(item));
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return [String(value)];
  }

  const record = asRecord(value);
  if (!record) {
    return [];
  }

  return [
    ...normalizeRelationshipValues(record.id),
    ...normalizeRelationshipValues(record.uid),
    ...normalizeRelationshipValues(record.slug),
  ];
}

function hasSeoValue(
  config: CmsLabConfig,
  data: Record<string, unknown>,
  kind: "title" | "description",
): boolean {
  return seoFieldPaths(config.cms.provider, kind).some(
    (path) => !isBlank(readCmsDataPath(data, path)),
  );
}

function seoFieldPaths(
  provider: CmsLabConfig["cms"]["provider"],
  kind: "title" | "description",
): string[] {
  const common =
    kind === "title"
      ? [
          "meta_title",
          "meta.title",
          "seo.title",
          "seo.metaTitle",
          "seo.meta_title",
          "seoTitle",
          "seo_title",
        ]
      : [
          "meta_description",
          "meta.description",
          "seo.description",
          "seo.metaDescription",
          "seo.meta_description",
          "seoDescription",
          "seo_description",
        ];

  if (provider === "wordpress") {
    return kind === "title"
      ? [
          ...common,
          "yoast_head_json.title",
          "yoast_head_json.og_title",
          "rank_math_title",
          "_yoast_wpseo_title",
        ]
      : [
          ...common,
          "yoast_head_json.description",
          "yoast_head_json.og_description",
          "rank_math_description",
          "_yoast_wpseo_metadesc",
        ];
  }

  if (provider === "prismic") {
    return kind === "title"
      ? [...common, "metaTitle"]
      : [...common, "metaDescription"];
  }

  return common;
}

function collectImagesMissingAlt(
  value: unknown,
  provider: CmsLabConfig["cms"]["provider"],
  path = "data",
): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectImagesMissingAlt(item, provider, `${path}[${index}]`),
    );
  }

  if (typeof value === "string") {
    if (provider === "wordpress") {
      return collectHtmlImagesMissingAlt(value, path);
    }
    return [];
  }

  const record = asRecord(value);
  if (!record) {
    return [];
  }

  const imageAlt = imageAltCandidate(provider, record);
  if (imageAlt.isImage && isBlankOrPlaceholderAlt(imageAlt.value)) {
    return [path];
  }

  return Object.entries(record).flatMap(([key, nested]) =>
    collectImagesMissingAlt(nested, provider, `${path}.${key}`),
  );
}

/**
 * Walk a WordPress-rendered HTML string (e.g. `content.rendered`,
 * `excerpt.rendered`, ACF wysiwyg fields) for `<img>` tags and return
 * the data paths of any image whose `alt` is missing, blank, or a
 * known placeholder.
 *
 * We use a small regex tokenizer instead of a full HTML parser because
 * the goal is alt-only inspection; we never modify or re-emit the
 * markup.
 */
function collectHtmlImagesMissingAlt(html: string, path: string): string[] {
  if (!html.includes("<img")) {
    return [];
  }

  const imgPattern = /<img\b[^>]*>/gi;
  const altPattern = /\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>=`]+))/i;
  const missing: string[] = [];
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = imgPattern.exec(html)) !== null) {
    const tag = match[0];
    const altMatch = altPattern.exec(tag);
    const altValue =
      altMatch === null
        ? undefined
        : (altMatch[1] ?? altMatch[2] ?? altMatch[3]);

    if (isBlankOrPlaceholderAlt(altValue)) {
      missing.push(`${path}[${index}].alt`);
    }

    index += 1;
  }

  return missing;
}

function imageAltCandidate(
  provider: CmsLabConfig["cms"]["provider"],
  record: Record<string, unknown>,
): { isImage: boolean; value: unknown } {
  if (
    typeof record.url === "string" &&
    ("alt" in record || "dimensions" in record)
  ) {
    return { isImage: true, value: record.alt };
  }

  if (
    provider === "strapi" &&
    typeof record.url === "string" &&
    ("alternativeText" in record || "formats" in record)
  ) {
    return { isImage: true, value: record.alternativeText };
  }

  if (
    provider === "wordpress" &&
    typeof record.source_url === "string" &&
    ("alt_text" in record || "media_type" in record || "mime_type" in record)
  ) {
    return { isImage: true, value: record.alt_text };
  }

  if (provider === "directus" && isDirectusImageRecord(record)) {
    return { isImage: true, value: record.description };
  }

  if (provider === "payload" && isPayloadImageRecord(record)) {
    return { isImage: true, value: record.alt };
  }

  if (provider === "contentful" && isContentfulImageRecord(record)) {
    return { isImage: true, value: record.description ?? record.title };
  }

  if (
    provider === "sanity" &&
    "asset" in record &&
    (asRecord(record.asset)?._ref || asRecord(record.asset)?._id)
  ) {
    const fieldAlt = record.alt;
    if (!isBlank(fieldAlt)) {
      return { isImage: true, value: fieldAlt };
    }

    // Fall back to alt set on the referenced sanity.imageAsset.
    // hydrateImageAssetMetadata in @cms-lab/sanity copies altText /
    // description / title onto the asset reference for us.
    const assetRecord = asRecord(record.asset);
    return {
      isImage: true,
      value:
        assetRecord?.altText ?? assetRecord?.description ?? assetRecord?.title,
    };
  }

  return { isImage: false, value: undefined };
}

function isPayloadImageRecord(record: Record<string, unknown>): boolean {
  if (typeof record.url !== "string") {
    return false;
  }

  return (
    (typeof record.mimeType === "string" &&
      record.mimeType.startsWith("image/")) ||
    hasImageExtension(record.filename) ||
    "alt" in record
  );
}

function isDirectusImageRecord(record: Record<string, unknown>): boolean {
  return (
    (typeof record.type === "string" && record.type.startsWith("image/")) ||
    hasImageExtension(record.filename_download) ||
    hasImageExtension(record.filename_disk) ||
    hasImageExtension(record.filename)
  );
}

function hasImageExtension(value: unknown): boolean {
  return (
    typeof value === "string" &&
    /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(value)
  );
}

function isContentfulImageRecord(record: Record<string, unknown>): boolean {
  const file = asRecord(record.file);
  return (
    (typeof file?.url === "string" &&
      (isContentfulImageHost(file.url) || hasImageExtension(file.url))) ||
    hasImageExtension(file?.fileName)
  );
}

function isContentfulImageHost(value: string): boolean {
  const normalized = value.startsWith("//") ? `https:${value}` : value;

  try {
    return new URL(normalized).hostname === "images.ctfassets.net";
  } catch {
    return false;
  }
}

function isCheckEnabled(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return defaultValue;
}

function shouldRunCheck(
  group: CheckGroup,
  config: CmsLabConfig,
  filters?: ScanFilters,
): boolean {
  const only = normalizeFilterList(filters?.only);
  const skip = normalizeFilterList(filters?.skip);

  if (only.length > 0 && !only.includes(group)) {
    return false;
  }

  if (skip.includes(group)) {
    return false;
  }

  if (group === "routes") {
    const routes = config.checks?.routes;
    if (typeof routes === "object" && routes !== null) {
      return true;
    }
    return isCheckEnabled(routes, true);
  }

  if (group === "seo") {
    return isCheckEnabled(config.checks?.seo, true);
  }

  if (group === "a11y") {
    return isCheckEnabled(config.checks?.a11y, true);
  }

  if (group === "images") {
    return isCheckEnabled(config.checks?.images, true);
  }

  if (group === "relationships" || group === "custom") {
    return true;
  }

  return isCheckEnabled(config.checks?.fields, true);
}

function shouldRunImageAltTextCheck(
  config: CmsLabConfig,
  filters?: ScanFilters,
): boolean {
  if (!isImageAltCheckEnabled(config)) {
    return false;
  }

  const only = normalizeFilterList(filters?.only);
  const skip = normalizeFilterList(filters?.skip);

  if (skip.includes("a11y") || skip.includes("images")) {
    return false;
  }

  if (only.length > 0 && !only.includes("a11y") && !only.includes("images")) {
    return false;
  }

  return true;
}

function isImageAltCheckEnabled(config: CmsLabConfig): boolean {
  if (config.checks?.images === false) {
    return false;
  }

  const a11y = config.checks?.a11y;
  if (typeof a11y === "boolean") {
    return a11y;
  }

  if (typeof a11y === "object") {
    return a11y.imgAlt !== false;
  }

  return true;
}

function filterDocuments(
  documents: CMSDocument[],
  filters?: ScanFilters,
): CMSDocument[] {
  const types = normalizeFilterList(filters?.types);
  if (types.length === 0) {
    return documents;
  }

  return documents.filter((document) => types.includes(document.type));
}

function normalizeFilterList(values: string[] | undefined): string[] {
  return [
    ...new Set((values ?? []).map((value) => value.trim()).filter(Boolean)),
  ];
}

function normalizeConcurrency(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 8;
  }

  return Math.max(1, Math.floor(value));
}

function normalizeRetries(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  return Math.max(0, Math.floor(value));
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function isSiteRelativePath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

function pathForDiagnostic(path: string): string {
  try {
    const url = new URL(path, "https://cms-lab.local");
    return `${url.pathname}${url.search ? "?[redacted]" : ""}`;
  } catch {
    return path;
  }
}

function siteUrlForDiagnostic(value: string): string {
  try {
    const url = new URL(value);
    const auth = url.username || url.password ? "[redacted]@" : "";
    const hash = url.hash ? "#[redacted]" : "";
    return `${url.protocol}//${auth}${url.host}${url.pathname}${url.search ? "?[redacted]" : ""}${hash}`;
  } catch {
    return redactSensitive(value);
  }
}

async function mapLimit<T, U>(
  values: T[],
  limit: number,
  mapper: (value: T, index: number) => Promise<U>,
): Promise<U[]> {
  const results = new Array<U>(values.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index], index);
    }
  }

  const workerCount = Math.min(limit, values.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      await worker();
    }),
  );

  return results;
}

function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

function isMissingFieldValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
}

function isBlankOrPlaceholderAlt(value: unknown): boolean {
  return (
    isBlank(value) ||
    (typeof value === "string" &&
      ["image", "photo", "picture"].includes(value.trim().toLowerCase()))
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return undefined;
}

function sourceFor(config: CmsLabConfig, document: CMSDocument): string {
  return `${config.cms.provider}:${document.type}#${document.id}`;
}

function messageFrom(error: unknown): string {
  return redactSensitive(
    error instanceof Error ? error.message : String(error),
  );
}

/**
 * Strip well-known token and credential shapes out of a string so it
 * is safe to surface in CLI output, debug logs, JUnit/Markdown/Slack
 * exports, or HTML reports.
 *
 * Patterns covered:
 *   - URL query params: `access_token=…`, `[?&]token=…`,
 *     `[?&]password=…`, `[?&]secret=…`, `[?&]api_key=`/`api-key=`/`apikey=`,
 *     `[?&]x-api-key=…`, `[?&]authorization=…`
 *   - `Bearer …` headers
 *   - Basic auth in URLs: `https://user:pass@host`
 *   - JWTs (`eyJ…\.…\.…`)
 *   - Stripe-style keys (`sk_live_…`, `sk_test_…`, `pk_live_…`, `rk_live_…`, etc.)
 *   - OpenAI / Anthropic-style keys (`sk-…`, including `sk-ant-…` and `sk-proj-…`)
 *   - GitHub PATs (`ghp_…`, `gho_…`, `ghs_…`, `ghr_…`, `ghu_…`, `github_pat_…`)
 */
export function redactSensitive(value: string): string {
  return value
    .replaceAll(/(access_token=)[^&\s]+/gi, "$1[redacted]")
    .replaceAll(
      /([?&](?:token|password|secret|api[-_]?key|apikey|x-api-key|authorization)=)[^&\s]+/gi,
      "$1[redacted]",
    )
    .replaceAll(/\bBearer\s+[-._~+/=a-z0-9]+/gi, "Bearer [redacted]")
    .replaceAll(/(https?:\/\/)([^:\s/@]+):([^@\s/]+)@/gi, "$1[redacted]@")
    .replaceAll(
      /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/g,
      "[redacted]",
    )
    .replaceAll(
      /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
      "[redacted]",
    )
    .replaceAll(/\bsk-[A-Za-z0-9_-]{20,}\b/g, "[redacted]")
    .replaceAll(/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, "[redacted]")
    .replaceAll(/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, "[redacted]");
}
