import {
  CmsFetchError,
  readCmsDataPath,
  type CMSDocument,
  type ContentfulCmsProviderConfig,
  type ContentfulContentTypeConfig,
  type FetchLike,
} from "@cms-lab/core";

type ContentfulResponse = {
  items?: unknown[];
  skip?: number;
  limit?: number;
  total?: number;
};

type ContentfulEntry = {
  sys?: {
    id?: unknown;
    publishedVersion?: unknown;
    publishedAt?: unknown;
    updatedAt?: unknown;
  };
  fields?: Record<string, unknown>;
};

export type FetchContentfulDocumentsOptions = {
  fetch?: FetchLike;
};

const defaultApiUrl = "https://cdn.contentful.com";
const defaultEnvironment = "master";
const pageSize = 100;

export async function fetchContentfulDocuments(
  config: ContentfulCmsProviderConfig,
  options: FetchContentfulDocumentsOptions = {},
): Promise<CMSDocument[]> {
  const fetchImpl = options.fetch ?? fetch;
  const documents: CMSDocument[] = [];

  for (const contentType of config.contentTypes) {
    let skip = 0;

    while (true) {
      const url = new URL(
        `/spaces/${encodeURIComponent(config.spaceId)}/environments/${encodeURIComponent(config.environment ?? defaultEnvironment)}/entries`,
        config.apiUrl ?? defaultApiUrl,
      );
      url.searchParams.set("content_type", contentType.contentType);
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("skip", String(skip));

      const response = await fetchJson<ContentfulResponse>(
        fetchImpl,
        url,
        authHeaders(config.accessToken),
      );
      const rows = response.items ?? [];
      documents.push(
        ...rows.map((entry) => normalizeContentfulEntry(contentType, entry)),
      );

      skip += rows.length;
      const total = response.total ?? skip;

      if (rows.length === 0 || skip >= total) {
        break;
      }
    }
  }

  return documents;
}

export function normalizeContentfulEntry(
  contentType: string | ContentfulContentTypeConfig,
  entry: unknown,
): CMSDocument {
  const config = contentTypeConfig(contentType);
  const record = asContentfulEntry(entry);
  const data = normalizeFields(record.fields ?? {});

  return {
    id: stringFrom(record.sys?.id, "Contentful entry is missing id"),
    type: config.type,
    uid: optionalString(
      mappedValue(data, config.uidField) ?? data.uid ?? data.slug,
    ),
    url: optionalString(mappedValue(data, config.urlField)),
    status: normalizeStatus(record.sys),
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
      `Contentful request failed with HTTP ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

function authHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function asContentfulEntry(value: unknown): ContentfulEntry {
  return value && typeof value === "object" ? (value as ContentfulEntry) : {};
}

function normalizeFields(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, selectLocalized(value)]),
  );
}

function selectLocalized(value: unknown): unknown {
  const record = asRecord(value);
  if (!record || !isLocalizedRecord(record)) {
    return value;
  }

  return record["en-US"] ?? record.en ?? Object.values(record)[0];
}

function isLocalizedRecord(record: Record<string, unknown>): boolean {
  const keys = Object.keys(record);
  return (
    keys.length > 0 && keys.every((key) => /^[a-z]{2}(?:-[A-Z]{2})?$/.test(key))
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
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
  contentType: string | ContentfulContentTypeConfig,
): ContentfulContentTypeConfig {
  return typeof contentType === "string"
    ? { type: contentType, contentType }
    : contentType;
}

function mappedValue(
  data: Record<string, unknown>,
  path: string | undefined,
): unknown {
  return path ? readCmsDataPath(data, path) : undefined;
}

function normalizeStatus(sys: ContentfulEntry["sys"]): CMSDocument["status"] {
  if (sys?.publishedVersion || sys?.publishedAt || sys?.updatedAt) {
    return "published";
  }

  return "draft";
}
