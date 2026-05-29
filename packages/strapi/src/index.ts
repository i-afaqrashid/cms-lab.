import {
  CmsFetchError,
  mapWithConcurrency,
  readCmsDataPath,
  type CMSDocument,
  type FetchLike,
  type StrapiCmsProviderConfig,
  type StrapiCollectionConfig,
  type StrapiSingleTypeConfig,
} from "@cms-lab/core";

const COLLECTION_CONCURRENCY = 6;

type StrapiResponse = {
  data?: unknown[];
  meta?: {
    pagination?: {
      page?: number;
      pageCount?: number;
    };
  };
};

type StrapiSingleTypeResponse = {
  data?: unknown;
};

export type FetchStrapiDocumentsOptions = {
  fetch?: FetchLike;
};

export async function fetchStrapiDocuments(
  config: StrapiCmsProviderConfig,
  options: FetchStrapiDocumentsOptions = {},
): Promise<CMSDocument[]> {
  const fetchImpl = options.fetch ?? fetch;

  const collectionDocuments = await mapWithConcurrency(
    config.collections ?? [],
    COLLECTION_CONCURRENCY,
    async (collection) => {
      const documents: CMSDocument[] = [];
      let page = 1;

      while (true) {
        const url = strapiEndpointUrl(config.url, collection.endpoint);
        url.searchParams.set("pagination[pageSize]", "100");
        url.searchParams.set("pagination[page]", String(page));
        url.searchParams.set("populate", "*");
        applyLocale(url, collection.locale ?? config.locale);

        const response = await fetchJson<StrapiResponse>(
          fetchImpl,
          url,
          authHeaders(config.token),
        );
        documents.push(
          ...(response.data ?? []).map((item) =>
            normalizeStrapiItem(collection, item, { entryKind: "collection" }),
          ),
        );
        const pageCount = response.meta?.pagination?.pageCount ?? page;

        if (page >= pageCount) {
          break;
        }

        page += 1;
      }

      return documents;
    },
  );

  const singleTypeDocuments = await mapWithConcurrency(
    config.singleTypes ?? [],
    COLLECTION_CONCURRENCY,
    async (singleType) => {
      const url = strapiEndpointUrl(config.url, singleType.endpoint);
      url.searchParams.set("populate", "*");
      applyLocale(url, singleType.locale ?? config.locale);

      const response = await fetchJson<StrapiSingleTypeResponse>(
        fetchImpl,
        url,
        authHeaders(config.token),
      );

      if (response.data != null) {
        return [
          normalizeStrapiItem(singleType, response.data, {
            fallbackUid: false,
            routable: false,
            entryKind: "single",
          }),
        ];
      }

      return [];
    },
  );

  return [...collectionDocuments.flat(), ...singleTypeDocuments.flat()];
}

export function normalizeStrapiItem(
  collection: string | StrapiCollectionConfig | StrapiSingleTypeConfig,
  item: unknown,
  options: {
    fallbackUid?: boolean;
    routable?: boolean;
    entryKind?: CMSDocument["entryKind"];
  } = {},
): CMSDocument {
  const config = collectionConfig(collection);
  const record = asRecord(item);
  const attributes = optionalRecord(record.attributes);
  const data = attributes ? { id: record.id, ...attributes } : record;
  const id = stringFrom(
    record.documentId ?? record.id ?? data.id,
    "Strapi item is missing id",
  );

  const document: CMSDocument = {
    id,
    type: config.type,
    status: normalizeStatus(data),
    data,
  };
  const uid = optionalString(
    mappedValue(data, config.uidField) ??
      data.uid ??
      data.slug ??
      (options.fallbackUid === false ? undefined : record.documentId) ??
      (options.fallbackUid === false ? undefined : record.id),
  );
  const url = optionalString(mappedValue(data, config.urlField));

  if (uid) {
    document.uid = uid;
  }
  if (url) {
    document.url = url;
  }
  if (options.routable !== undefined) {
    document.routable = options.routable;
  }
  if (options.entryKind) {
    document.entryKind = options.entryKind;
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

function strapiEndpointUrl(baseUrl: string, endpoint: string): URL {
  return new URL(`/api/${trimSlashes(endpoint)}`, baseUrl);
}

function applyLocale(url: URL, locale: string | undefined): void {
  if (locale) {
    url.searchParams.set("locale", locale);
  }
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

function collectionConfig(
  collection: string | StrapiCollectionConfig | StrapiSingleTypeConfig,
): StrapiCollectionConfig | StrapiSingleTypeConfig {
  return typeof collection === "string"
    ? { type: collection, endpoint: collection }
    : collection;
}

function mappedValue(
  data: Record<string, unknown>,
  path: string | undefined,
): unknown {
  return path ? readCmsDataPath(data, path) : undefined;
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
