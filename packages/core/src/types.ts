export type CMSDocumentStatus = "published" | "draft";

export type CMSDocument = {
  id: string;
  type: string;
  uid?: string;
  url?: string;
  routable?: boolean;
  status: CMSDocumentStatus;
  data: unknown;
};

export type DiagnosticSeverity = "error" | "warning" | "info";

export type Diagnostic = {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  path?: string;
  source?: string;
};

export type DiagnosticExplanation = {
  code: string;
  severity: DiagnosticSeverity;
  title: string;
  meaning: string;
  fix: string;
};

export type ProjectInfo = {
  framework: "next";
  router: "app" | "pages";
  rootDir: string;
  appDir?: string;
  pagesDir?: string;
};

export type RouteDefinition = {
  type: string;
  pattern: string;
  getPath: (document: CMSDocument) => string;
};

export type RequiredFieldRule = {
  type: string;
  path: string;
  severity?: "error" | "warning";
};

export type PrismicCmsProviderConfig = {
  provider: "prismic";
  repositoryName: string;
  accessToken?: string;
  endpoint?: string;
};

export type CmsFieldMappingConfig = {
  uidField?: string;
  urlField?: string;
};

export type StrapiCollectionConfig = {
  type: string;
  endpoint: string;
} & CmsFieldMappingConfig;

export type StrapiSingleTypeConfig = {
  type: string;
  endpoint: string;
} & CmsFieldMappingConfig;

export type StrapiCmsProviderConfig = {
  provider: "strapi";
  url: string;
  token?: string;
  collections?: StrapiCollectionConfig[];
  singleTypes?: StrapiSingleTypeConfig[];
};

export type DirectusCollectionConfig = {
  type: string;
  collection: string;
} & CmsFieldMappingConfig;

export type DirectusCmsProviderConfig = {
  provider: "directus";
  url: string;
  token?: string;
  collections: DirectusCollectionConfig[];
};

export type WordPressContentTypeConfig = {
  type: string;
  endpoint: string;
} & CmsFieldMappingConfig;

export type WordPressCmsProviderConfig = {
  provider: "wordpress";
  url: string;
  contentTypes?: WordPressContentTypeConfig[];
};

export type ContentfulContentTypeConfig = {
  type: string;
  contentType: string;
} & CmsFieldMappingConfig;

export type ContentfulCmsProviderConfig = {
  provider: "contentful";
  spaceId: string;
  accessToken: string;
  environment?: string;
  apiUrl?: string;
  contentTypes: ContentfulContentTypeConfig[];
};

export type SanityContentTypeConfig = {
  type: string;
  documentType: string;
} & CmsFieldMappingConfig;

export type SanityCmsProviderConfig = {
  provider: "sanity";
  projectId: string;
  dataset: string;
  apiVersion?: string;
  token?: string;
  useCdn?: boolean;
  perspective?: "published" | "drafts" | "raw";
  contentTypes: SanityContentTypeConfig[];
};

export type CmsProviderConfig =
  | PrismicCmsProviderConfig
  | StrapiCmsProviderConfig
  | DirectusCmsProviderConfig
  | WordPressCmsProviderConfig
  | ContentfulCmsProviderConfig
  | SanityCmsProviderConfig;

export type CmsLabConfig = {
  site: {
    url: string;
  };
  framework: {
    type: "next";
    router: "app" | "pages";
  };
  cms: CmsProviderConfig;
  routes: RouteDefinition[];
  checks?: {
    routes?: boolean;
    seo?: boolean | { metaTitle?: boolean; metaDescription?: boolean };
    images?: boolean;
    a11y?: boolean | { imgAlt?: boolean };
    fields?: boolean | { required?: RequiredFieldRule[] };
  };
};

export type ScanSummary = {
  errors: number;
  warnings: number;
  info: number;
};

export type ScanResult = {
  project: ProjectInfo;
  documents: CMSDocument[];
  diagnostics: Diagnostic[];
  summary: ScanSummary;
};

export type FetchLike = typeof fetch;

export type CheckGroup = "routes" | "seo" | "a11y" | "images" | "fields";

export type ScanFilters = {
  types?: string[];
  only?: CheckGroup[];
  skip?: CheckGroup[];
};
