import {
  CmsFetchError,
  readCmsDataPath,
  type CMSDocument,
  type FetchLike,
  type PayloadCmsProviderConfig,
  type PayloadCollectionConfig,
} from "@cms-lab/core";

type PayloadResponse = {
  docs?: unknown[];
  hasNextPage?: boolean;
  nextPage?: number | null;
};

export type FetchPayloadDocumentsOptions = {
  fetch?: FetchLike;
};

const DEFAULT_API_PATH = "/api";
const PAGE_SIZE = 100;

export async function fetchPayloadDocuments(
  config: PayloadCmsProviderConfig,
  options: FetchPayloadDocumentsOptions = {},
): Promise<CMSDocument[]> {
  const fetchImpl = options.fetch ?? fetch;
  const documents: CMSDocument[] = [];
  const apiPath = normalizeApiPath(config.apiPath);

  for (const collection of config.collections) {
    let page = 1;

    while (true) {
      const url = new URL(
        `${apiPath}/${trimSlashes(collection.collection)}`,
        config.url,
      );
      url.searchParams.set("limit", String(PAGE_SIZE));
      url.searchParams.set("page", String(page));
      url.searchParams.set("depth", "1");

      const response = await fetchJson<PayloadResponse>(
        fetchImpl,
        url,
        authHeaders(config.token),
      );
      const rows = response.docs ?? [];
      documents.push(
        ...rows.map((item) => normalizePayloadDoc(collection, item)),
      );

      const hasMore = response.hasNextPage ?? rows.length === PAGE_SIZE;
      if (!hasMore || rows.length === 0) {
        break;
      }

      page += 1;
    }
  }

  return documents;
}

export function normalizePayloadDoc(
  collection: string | PayloadCollectionConfig,
  item: unknown,
): CMSDocument {
  const config = collectionConfig(collection);
  const data = asRecord(item);
  const id = stringFrom(
    data.id ?? data._id ?? data.slug,
    "Payload document is missing id",
  );

  const document: CMSDocument = {
    id,
    type: config.type,
    uid: optionalString(
      mappedValue(data, config.uidField) ?? data.slug ?? data.id ?? data._id,
    ),
    url: optionalString(mappedValue(data, config.urlField)),
    status: normalizeStatus(data._status),
    data,
  };

  if (config.routable !== undefined) {
    document.routable = config.routable;
  }

  return document;
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
      `Payload request failed with HTTP ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

/**
 * Payload accepts either a JWT (`Authorization: JWT <token>`) or an API key
 * (`Authorization: <users-collection> API-Key <key>`). When the configured
 * token already includes a scheme (it contains whitespace) we send it
 * verbatim; otherwise we assume a JWT.
 */
function authHeaders(token: string | undefined): Record<string, string> {
  if (!token) {
    return { Accept: "application/json" };
  }

  const value = /\s/.test(token.trim()) ? token.trim() : `JWT ${token}`;
  return { Accept: "application/json", Authorization: value };
}

function normalizeApiPath(apiPath: string | undefined): string {
  const trimmed = trimSlashes(apiPath ?? DEFAULT_API_PATH);
  return trimmed ? `/${trimmed}` : "";
}

function trimSlashes(value: string): string {
  let start = 0;
  let end = value.length;

  while (start < end && value.charCodeAt(start) === 47) {
    start += 1;
  }

  while (end > start && value.charCodeAt(end - 1) === 47) {
    end -= 1;
  }

  return value.slice(start, end);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
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

function collectionConfig(
  collection: string | PayloadCollectionConfig,
): PayloadCollectionConfig {
  return typeof collection === "string"
    ? { type: collection, collection }
    : collection;
}

function mappedValue(
  data: Record<string, unknown>,
  path: string | undefined,
): unknown {
  return path ? readCmsDataPath(data, path) : undefined;
}

/**
 * Payload sets `_status` to `draft` or `published` when draft support is
 * enabled on a collection. Collections without drafts omit the field, so we
 * treat anything other than an explicit `draft` as published.
 */
function normalizeStatus(value: unknown): CMSDocument["status"] {
  const status = optionalString(value)?.toLowerCase();
  return status === "draft" ? "draft" : "published";
}
