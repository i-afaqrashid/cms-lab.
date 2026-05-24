export type CMSDocumentStatus = "published" | "draft";

export type CMSDocument = {
  id: string;
  type: string;
  uid?: string;
  url?: string;
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

export type StrapiCollectionConfig = {
  type: string;
  endpoint: string;
};

export type StrapiCmsProviderConfig = {
  provider: "strapi";
  url: string;
  token?: string;
  collections: StrapiCollectionConfig[];
};

export type DirectusCollectionConfig = {
  type: string;
  collection: string;
};

export type DirectusCmsProviderConfig = {
  provider: "directus";
  url: string;
  token?: string;
  collections: DirectusCollectionConfig[];
};

export type WordPressContentTypeConfig = {
  type: string;
  endpoint: string;
};

export type WordPressCmsProviderConfig = {
  provider: "wordpress";
  url: string;
  contentTypes?: WordPressContentTypeConfig[];
};

export type CmsProviderConfig =
  | PrismicCmsProviderConfig
  | StrapiCmsProviderConfig
  | DirectusCmsProviderConfig
  | WordPressCmsProviderConfig;

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
