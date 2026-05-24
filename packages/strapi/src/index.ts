import {
  CmsFetchError,
  type CMSDocument,
  type FetchLike,
  type StrapiCmsProviderConfig,
} from "@cms-lab/core";

type StrapiResponse = {
  data?: unknown[];
  meta?: {
    pagination?: {
      page?: number;
      pageCount?: number;
    };
  };
};

export type FetchStrapiDocumentsOptions = {
  fetch?: FetchLike;
};

export async function fetchStrapiDocuments(
  config: StrapiCmsProviderConfig,
  options: FetchStrapiDocumentsOptions = {},
): Promise<CMSDocument[]> {
  const fetchImpl = options.fetch ?? fetch;
  const documents: CMSDocument[] = [];

  for (const collection of config.collections) {
    let page = 1;

    while (true) {
      const url = new URL(
        `/api/${trimSlashes(collection.endpoint)}`,
        config.url,
      );
      url.searchParams.set("pagination[pageSize]", "100");
      url.searchParams.set("pagination[page]", String(page));
      url.searchParams.set("populate", "*");

      const response = await fetchJson<StrapiResponse>(
        fetchImpl,
        url,
        authHeaders(config.token),
      );
      documents.push(
        ...(response.data ?? []).map((item) =>
          normalizeStrapiItem(collection.type, item),
        ),
      );
      const pageCount = response.meta?.pagination?.pageCount ?? page;

      if (page >= pageCount) {
        break;
      }

      page += 1;
    }
  }

  return documents;
}

export function normalizeStrapiItem(type: string, item: unknown): CMSDocument {
  const record = asRecord(item);
  const attributes = optionalRecord(record.attributes);
  const data = attributes ? { id: record.id, ...attributes } : record;
  const id = stringFrom(
    record.documentId ?? record.id ?? data.id,
    "Strapi item is missing id",
  );

  return {
    id,
    type,
    uid: optionalString(
      data.uid ?? data.slug ?? record.documentId ?? record.id,
    ),
    status: normalizeStatus(data),
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
      `Strapi request failed with HTTP ${response.status}`,
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
  return value.replace(/^\/+|\/+$/g, "");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function optionalRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object"
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

function normalizeStatus(data: Record<string, unknown>): CMSDocument["status"] {
  if ("publishedAt" in data && data.publishedAt === null) {
    return "draft";
  }

  const status = optionalString(data.status)?.toLowerCase();
  if (status && !["publish", "published", "live"].includes(status)) {
    return "draft";
  }

  return "published";
}
