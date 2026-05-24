import {
  CmsFetchError,
  type CMSDocument,
  type DirectusCmsProviderConfig,
  type FetchLike,
} from "@cms-lab/core";

type DirectusResponse = {
  data?: unknown[];
};

export type FetchDirectusDocumentsOptions = {
  fetch?: FetchLike;
};

export async function fetchDirectusDocuments(
  config: DirectusCmsProviderConfig,
  options: FetchDirectusDocumentsOptions = {},
): Promise<CMSDocument[]> {
  const fetchImpl = options.fetch ?? fetch;
  const documents: CMSDocument[] = [];
  const pageSize = 100;

  for (const collection of config.collections) {
    let page = 1;

    while (true) {
      const url = new URL(
        `/items/${trimSlashes(collection.collection)}`,
        config.url,
      );
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("page", String(page));

      const response = await fetchJson<DirectusResponse>(
        fetchImpl,
        url,
        authHeaders(config.token),
      );
      const rows = response.data ?? [];
      documents.push(
        ...rows.map((item) => normalizeDirectusItem(collection.type, item)),
      );

      if (rows.length < pageSize) {
        break;
      }

      page += 1;
    }
  }

  return documents;
}

export function normalizeDirectusItem(
  type: string,
  item: unknown,
): CMSDocument {
  const data = asRecord(item);
  const id = stringFrom(
    data.id ?? data.uid ?? data.slug,
    "Directus item is missing id",
  );

  return {
    id,
    type,
    uid: optionalString(data.uid ?? data.slug ?? data.id),
    status: normalizeStatus(data.status),
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
      `Directus request failed with HTTP ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

function authHeaders(token: string | undefined): Record<string, string> {
  return token
    ? { Accept: "application/json", Authorization: `Bearer ${token}` }
    : { Accept: "application/json" };
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

function normalizeStatus(value: unknown): CMSDocument["status"] {
  const status = optionalString(value)?.toLowerCase();
  if (status && !["publish", "published", "live"].includes(status)) {
    return "draft";
  }

  return "published";
}
