import {
  CmsFetchError,
  type CMSDocument,
  type FetchLike,
  type SanityCmsProviderConfig,
} from "@cms-lab/core";

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
  const documents: CMSDocument[] = [];

  for (const contentType of config.contentTypes) {
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
    documents.push(
      ...rows.map((document) =>
        normalizeSanityDocument(contentType.type, document),
      ),
    );
  }

  return documents;
}

export function normalizeSanityDocument(
  type: string,
  document: unknown,
): CMSDocument {
  const data = asRecord(document);
  const id = stringFrom(data._id, "Sanity document is missing _id");

  return {
    id,
    type,
    uid: optionalString(data.uid ?? slugValue(data.slug)),
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
