import {
  CmsFetchError,
  readCmsDataPath,
  type CMSDocument,
  type FetchLike,
  type WordPressCmsProviderConfig,
  type WordPressContentTypeConfig,
} from "@cms-lab/core";

type WordPressItem = Record<string, unknown>;

export type FetchWordPressDocumentsOptions = {
  fetch?: FetchLike;
};

const defaultContentTypes: WordPressContentTypeConfig[] = [
  { type: "page", endpoint: "pages" },
  { type: "post", endpoint: "posts" },
];

export async function fetchWordPressDocuments(
  config: WordPressCmsProviderConfig,
  options: FetchWordPressDocumentsOptions = {},
): Promise<CMSDocument[]> {
  const fetchImpl = options.fetch ?? fetch;
  const documents: CMSDocument[] = [];

  for (const contentType of config.contentTypes ?? defaultContentTypes) {
    let page = 1;

    while (true) {
      const url = new URL(
        `/wp-json/wp/v2/${trimSlashes(contentType.endpoint)}`,
        config.url,
      );
      url.searchParams.set("per_page", "100");
      url.searchParams.set("page", String(page));

      const { rows, pages } = await fetchRows(fetchImpl, url);
      documents.push(
        ...rows.map((row) => normalizeWordPressItem(contentType, row)),
      );
      const totalPages = pages;

      if (page >= totalPages) {
        break;
      }

      page += 1;
    }
  }

  return documents;
}

async function fetchRows(
  fetchImpl: FetchLike,
  url: URL,
): Promise<{ rows: WordPressItem[]; pages: number }> {
  let response: Response;

  try {
    response = await fetchImpl(url, {
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    throw new CmsFetchError(
      error instanceof Error ? error.message : `Failed to reach ${url}`,
    );
  }

  if (!response.ok) {
    throw new CmsFetchError(
      `WordPress request failed with HTTP ${response.status}`,
    );
  }

  return {
    rows: (await response.json()) as WordPressItem[],
    pages: Number(response.headers.get("x-wp-totalpages") ?? "1") || 1,
  };
}

export function normalizeWordPressItem(
  contentType: string | WordPressContentTypeConfig,
  data: WordPressItem,
): CMSDocument {
  const config = contentTypeConfig(contentType);

  return {
    id: stringFrom(data.id, "WordPress item is missing id"),
    type: config.type,
    uid: optionalString(
      mappedValue(data, config.uidField) ?? data.slug ?? data.id,
    ),
    url: optionalString(mappedValue(data, config.urlField) ?? data.link),
    status: normalizeStatus(data.status),
    data,
  };
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
  contentType: string | WordPressContentTypeConfig,
): WordPressContentTypeConfig {
  return typeof contentType === "string"
    ? { type: contentType, endpoint: contentType }
    : contentType;
}

function mappedValue(
  data: Record<string, unknown>,
  path: string | undefined,
): unknown {
  return path ? readCmsDataPath(data, path) : undefined;
}

function normalizeStatus(value: unknown): CMSDocument["status"] {
  const status = optionalString(value)?.toLowerCase();
  if (status && !["publish", "published"].includes(status)) {
    return "draft";
  }

  return "published";
}
