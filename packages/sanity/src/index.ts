import {
  CmsFetchError,
  mapWithConcurrency,
  readCmsDataPath,
  type CMSDocument,
  type FetchLike,
  type SanityCmsProviderConfig,
  type SanityContentTypeConfig,
} from "@cms-lab/core";

const COLLECTION_CONCURRENCY = 6;

type SanityResponse = {
  result?: unknown;
};

export type FetchSanityDocumentsOptions = {
  fetch?: FetchLike;
};

const defaultApiVersion = "2025-02-19";

export async function fetchSanityDocuments(
  config: SanityCmsProviderConfig,
  options: FetchSanityDocumentsOptions = {},
): Promise<CMSDocument[]> {
  const fetchImpl = options.fetch ?? fetch;

  const perContentType = await mapWithConcurrency(
    config.contentTypes,
    COLLECTION_CONCURRENCY,
    async (contentType) => {
      const url = sanityQueryUrl(config);
      url.searchParams.set("query", "*[_type == $type]");
      url.searchParams.set("$type", JSON.stringify(contentType.documentType));
      url.searchParams.set("perspective", config.perspective ?? "published");

      const response = await fetchJson<SanityResponse>(
        fetchImpl,
        url,
        authHeaders(config.token),
      );
      const rows = Array.isArray(response.result) ? response.result : [];
      return rows.map((document) =>
        normalizeSanityDocument(contentType, document),
      );
    },
  );

  const documents = perContentType.flat();

  await hydrateImageAssetMetadata(config, fetchImpl, documents);

  return documents;
}

/**
 * Side-load `sanity.imageAsset` documents that are referenced inside
 * fetched content and copy their `altText` / `description` / `title`
 * onto the matching `asset` reference. Lets the cms-lab image-alt
 * check honour alt text set on the asset (a common Sanity studio
 * convention) instead of false-flagging images that only have
 * asset-level alt.
 *
 * Any field already present on the asset reference is preserved.
 */
async function hydrateImageAssetMetadata(
  config: SanityCmsProviderConfig,
  fetchImpl: FetchLike,
  documents: CMSDocument[],
): Promise<void> {
  const assetIds = new Set<string>();
  for (const document of documents) {
    collectImageAssetIds(document.data, assetIds);
  }

  if (assetIds.size === 0) {
    return;
  }

  const url = sanityQueryUrl(config);
  url.searchParams.set(
    "query",
    '*[_type == "sanity.imageAsset" && _id in $ids]{ _id, altText, description, title }',
  );
  url.searchParams.set("$ids", JSON.stringify([...assetIds]));
  url.searchParams.set("perspective", config.perspective ?? "published");

  const response = await fetchJson<SanityResponse>(
    fetchImpl,
    url,
    authHeaders(config.token),
  );
  const rows = Array.isArray(response.result) ? response.result : [];
  const assetMap = new Map<
    string,
    { altText?: string; description?: string; title?: string }
  >();

  for (const row of rows) {
    const record = asRecord(row);
    const id = record._id;
    if (typeof id !== "string") {
      continue;
    }

    assetMap.set(id, {
      altText: typeof record.altText === "string" ? record.altText : undefined,
      description:
        typeof record.description === "string" ? record.description : undefined,
      title: typeof record.title === "string" ? record.title : undefined,
    });
  }

  for (const document of documents) {
    decorateImageAssets(document.data, assetMap);
  }
}

function collectImageAssetIds(value: unknown, ids: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectImageAssetIds(item, ids);
    }
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const record = value as Record<string, unknown>;
  const asset = record.asset;
  if (asset && typeof asset === "object") {
    const ref = (asset as Record<string, unknown>)._ref;
    if (typeof ref === "string" && ref.startsWith("image-")) {
      ids.add(ref);
    }
  }

  for (const nested of Object.values(record)) {
    collectImageAssetIds(nested, ids);
  }
}

function decorateImageAssets(
  value: unknown,
  assetMap: Map<
    string,
    { altText?: string; description?: string; title?: string }
  >,
): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      decorateImageAssets(item, assetMap);
    }
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const record = value as Record<string, unknown>;
  const asset = record.asset;
  if (asset && typeof asset === "object") {
    const assetRecord = asset as Record<string, unknown>;
    const ref = assetRecord._ref;
    if (typeof ref === "string" && ref.startsWith("image-")) {
      const metadata = assetMap.get(ref);
      if (metadata) {
        if (
          metadata.altText !== undefined &&
          assetRecord.altText === undefined
        ) {
          assetRecord.altText = metadata.altText;
        }
        if (
          metadata.description !== undefined &&
          assetRecord.description === undefined
        ) {
          assetRecord.description = metadata.description;
        }
        if (metadata.title !== undefined && assetRecord.title === undefined) {
          assetRecord.title = metadata.title;
        }
      }
    }
  }

  for (const nested of Object.values(record)) {
    decorateImageAssets(nested, assetMap);
  }
}

export function normalizeSanityDocument(
  contentType: string | SanityContentTypeConfig,
  document: unknown,
): CMSDocument {
  const config = contentTypeConfig(contentType);
  const data = asRecord(document);
  const id = stringFrom(data._id, "Sanity document is missing _id");

  return {
    id,
    type: config.type,
    uid: optionalString(
      mappedValue(data, config.uidField) ?? data.uid ?? slugValue(data.slug),
    ),
    url: optionalString(mappedValue(data, config.urlField)),
    status: id.startsWith("drafts.") ? "draft" : "published",
    data,
  };
}

async function fetchJson<T>(
  fetchImpl: FetchLike,
  url: URL,
  headers: Record<string, string>,
): Promise<T> {
  let response: Response;

  try {
    response = await fetchImpl(url, { headers });
  } catch (error) {
    throw new CmsFetchError(
      error instanceof Error ? error.message : `Failed to reach ${url}`,
    );
  }

  if (!response.ok) {
    throw new CmsFetchError(
      `Sanity request failed with HTTP ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

function sanityQueryUrl(config: SanityCmsProviderConfig): URL {
  const host = `${config.projectId}.${config.useCdn ? "apicdn" : "api"}.sanity.io`;
  const version = apiVersion(config.apiVersion ?? defaultApiVersion);

  return new URL(
    `https://${host}/${version}/data/query/${encodeURIComponent(config.dataset)}`,
  );
}

function apiVersion(value: string): string {
  return value.startsWith("v") ? value : `v${value}`;
}

function authHeaders(token: string | undefined): Record<string, string> {
  return token
    ? { Accept: "application/json", Authorization: `Bearer ${token}` }
    : { Accept: "application/json" };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function slugValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value;
  }

  const record =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : undefined;

  return record?.current;
}

function stringFrom(value: unknown, message: string): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  throw new CmsFetchError(message);
}

function optionalString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function contentTypeConfig(
  contentType: string | SanityContentTypeConfig,
): SanityContentTypeConfig {
  return typeof contentType === "string"
    ? { type: contentType, documentType: contentType }
    : contentType;
}

function mappedValue(
  data: Record<string, unknown>,
  path: string | undefined,
): unknown {
  return path ? readCmsDataPath(data, path) : undefined;
}
