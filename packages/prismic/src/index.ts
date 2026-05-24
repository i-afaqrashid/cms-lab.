import {
  CmsFetchError,
  type CMSDocument,
  type FetchLike,
  type PrismicCmsProviderConfig,
} from "@cms-lab/core";

type PrismicApiDocument = {
  id?: string;
  type?: string;
  uid?: string | null;
  url?: string | null;
  data?: unknown;
};

type PrismicApiRoot = {
  refs?: Array<{ ref?: string; isMasterRef?: boolean }>;
  forms?: {
    everything?: {
      action?: string;
    };
  };
};

type PrismicSearchResponse = {
  page?: number;
  total_pages?: number;
  results?: PrismicApiDocument[];
};

export type FetchPrismicDocumentsOptions = {
  fetch?: FetchLike;
};

export function normalizePrismicDocument(
  input: PrismicApiDocument,
): CMSDocument {
  return {
    id: requireString(input.id, "Prismic document is missing id"),
    type: requireString(input.type, "Prismic document is missing type"),
    uid: input.uid ?? undefined,
    url: input.url ?? undefined,
    status: "published",
    data: input.data ?? {},
  };
}

export async function fetchPrismicDocuments(
  config: PrismicCmsProviderConfig,
  options: FetchPrismicDocumentsOptions = {},
): Promise<CMSDocument[]> {
  const fetchImpl = options.fetch ?? fetch;
  const endpoint =
    config.endpoint ?? `https://${config.repositoryName}.cdn.prismic.io/api/v2`;
  const headers = buildHeaders();
  const api = await fetchJson<PrismicApiRoot>(
    fetchImpl,
    withAccessToken(endpoint, config).toString(),
    headers,
  );
  const ref =
    api.refs?.find((candidate) => candidate.isMasterRef)?.ref ??
    api.refs?.[0]?.ref;

  if (!ref) {
    throw new CmsFetchError(
      `Prismic repository ${config.repositoryName} did not return a master ref`,
    );
  }

  const action =
    api.forms?.everything?.action ??
    `${endpoint.replace(/\/$/, "")}/documents/search`;
  const documents: CMSDocument[] = [];
  let page = 1;

  while (true) {
    const url = new URL(action);
    url.searchParams.set("ref", ref);
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("page", String(page));
    if (config.accessToken) {
      url.searchParams.set("access_token", config.accessToken);
    }

    const response = await fetchJson<PrismicSearchResponse>(
      fetchImpl,
      url.toString(),
      headers,
    );
    documents.push(...(response.results ?? []).map(normalizePrismicDocument));
    const totalPages = response.total_pages ?? response.page ?? page;

    if (page >= totalPages) {
      break;
    }

    page += 1;
  }

  return documents;
}

async function fetchJson<T>(
  fetchImpl: FetchLike,
  url: string,
  headers: Record<string, string>,
): Promise<T> {
  let response: Response;

  try {
    response = await fetchImpl(url, { headers });
  } catch (error) {
    throw new CmsFetchError(
      redactAccessToken(
        error instanceof Error ? error.message : `Failed to reach ${url}`,
      ),
    );
  }

  if (!response.ok) {
    throw new CmsFetchError(
      `Prismic request failed with HTTP ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

function redactAccessToken(message: string): string {
  return message.replace(/access_token=[^&\s]+/g, "access_token=[redacted]");
}

function buildHeaders(): Record<string, string> {
  return {
    Accept: "application/json",
  };
}

function withAccessToken(url: string, config: PrismicCmsProviderConfig): URL {
  const parsed = new URL(url);
  if (config.accessToken) {
    parsed.searchParams.set("access_token", config.accessToken);
  }

  return parsed;
}

function requireString(value: unknown, message: string): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  throw new CmsFetchError(message);
}
