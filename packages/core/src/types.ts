export type CMSDocumentStatus = "published" | "draft";

export type CMSDocument = {
  id: string;
  type: string;
  uid?: string;
  url?: string;
  routable?: boolean;
  entryKind?: "collection" | "single";
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

export type Soft404Options = {
  /** Case-insensitive substring matches in the response body. */
  strings?: string[];
  /** Regex source matched (case-insensitive) against the `<title>` of the body. */
  titlePattern?: string;
};

export type RouteChecksOptions = {
  soft404?: Soft404Options;
};

export type RelationshipRule = {
  from: string;
  to: string;
  where: {
    fromField: string;
    toField: string;
  };
  min?: number;
  severity?: DiagnosticSeverity;
};

/**
 * Declarative assertion applied to the value at a custom rule's `path`.
 *
 * String shorthands cover the param-less checks. The object form combines
 * one or more constraints; the value must satisfy every constraint present
 * for the rule to pass.
 */
export type CustomAssertion =
  | "present"
  | "futureDate"
  | "pastDate"
  | {
      /** Value must be present (not null, undefined, blank, or empty array). */
      present?: boolean;
      /** Numeric value (or numeric string) compared with the bound. */
      gt?: number;
      gte?: number;
      lt?: number;
      lte?: number;
      /** Stringified value must be one of these. */
      oneOf?: (string | number | boolean)[];
      /** String value must match this regular expression source. */
      matches?: string;
      /** String value must NOT match this regular expression source. */
      notMatches?: string;
      /** Length bounds for strings and arrays. */
      minLength?: number;
      maxLength?: number;
      /** Value must parse to a date strictly in the future / past. */
      futureDate?: boolean;
      pastDate?: boolean;
      /** Value must parse to a date newer / older than `now - duration`. */
      newerThan?: string;
      olderThan?: string;
    };

/**
 * Declarative custom rule. Applies to every document of `type` (optionally
 * narrowed by `filter`), reads the value at `path` within `document.data`,
 * and emits a diagnostic when `assert` fails.
 */
export type CustomDeclarativeRule = {
  /** Diagnostic code. Defaults to `CUSTOM-RULE`. */
  code?: string;
  type: string;
  /** Only apply to documents whose data matches every key/value here. */
  filter?: Record<string, string | number | boolean>;
  path: string;
  assert: CustomAssertion;
  severity?: DiagnosticSeverity;
  /** Override the generated diagnostic message. */
  message?: string;
};

/**
 * Context passed to a functional custom rule. The `error`/`warning`/`info`
 * helpers push diagnostics that flow through every cms-lab report format.
 */
export type CustomRuleContext = {
  document: CMSDocument;
  documents: CMSDocument[];
  config: CmsLabConfig;
  /** Read a dotted path out of `document.data`. */
  readPath: (path: string) => unknown;
  error: (code: string, message: string, options?: { path?: string }) => void;
  warning: (code: string, message: string, options?: { path?: string }) => void;
  info: (code: string, message: string, options?: { path?: string }) => void;
};

/** Functional custom rule. Called once per document. */
export type CustomRuleFn = (
  document: CMSDocument,
  context: CustomRuleContext,
) => void;

export type CustomRule = CustomDeclarativeRule | CustomRuleFn;

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

export type StrapiLocaleConfig = {
  locale?: string;
};

export type StrapiCollectionConfig = {
  type: string;
  endpoint: string;
} & CmsFieldMappingConfig &
  StrapiLocaleConfig;

export type StrapiSingleTypeConfig = {
  type: string;
  endpoint: string;
} & CmsFieldMappingConfig &
  StrapiLocaleConfig;

export type StrapiCmsProviderConfig = {
  provider: "strapi";
  url: string;
  token?: string;
  locale?: string;
  collections?: StrapiCollectionConfig[];
  singleTypes?: StrapiSingleTypeConfig[];
};

export type DirectusCollectionConfig = {
  type: string;
  collection: string;
  routable?: boolean;
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

export type PayloadCollectionConfig = {
  type: string;
  collection: string;
  routable?: boolean;
} & CmsFieldMappingConfig;

export type PayloadCmsProviderConfig = {
  provider: "payload";
  url: string;
  apiPath?: string;
  token?: string;
  collections: PayloadCollectionConfig[];
};

export type CmsProviderConfig =
  | PrismicCmsProviderConfig
  | StrapiCmsProviderConfig
  | DirectusCmsProviderConfig
  | WordPressCmsProviderConfig
  | ContentfulCmsProviderConfig
  | SanityCmsProviderConfig
  | PayloadCmsProviderConfig;

export type CmsLabConfig = {
  site: {
    url: string;
    healthPath?: string;
    healthUrl?: string;
  };
  framework: {
    type: "next";
    router: "app" | "pages";
  };
  cms: CmsProviderConfig;
  routes: RouteDefinition[];
  checks?: {
    routes?: boolean | RouteChecksOptions;
    seo?:
      | boolean
      | {
          metaTitle?: boolean;
          metaDescription?: boolean;
          /**
           * Open Graph / Twitter card validation at the CMS field level.
           * Opt-in, because many Next.js apps generate social cards at
           * runtime (generateMetadata / next/og) rather than storing them
           * in the CMS. `true` checks og:image; the object form enables
           * og:title/description and the Twitter image too.
           */
          og?:
            | boolean
            | {
                image?: boolean;
                title?: boolean;
                description?: boolean;
                twitter?: boolean;
              };
        };
    images?: boolean;
    a11y?: boolean | { imgAlt?: boolean };
    fields?: boolean | { required?: RequiredFieldRule[] };
    relationships?: RelationshipRule[];
    custom?: CustomRule[];
  };
};

export type ScanSummary = {
  errors: number;
  warnings: number;
  info: number;
};

export type DiagnosticGroupSummary = {
  key: string;
  severity: DiagnosticSeverity;
  code: string;
  count: number;
  label: string;
  type?: string;
  routePattern?: string;
  examples: string[];
};

export type ScanResult = {
  project: ProjectInfo;
  documents: CMSDocument[];
  diagnostics: Diagnostic[];
  diagnosticGroups?: DiagnosticGroupSummary[];
  summary: ScanSummary;
};

export type FetchLike = typeof fetch;

export type CheckGroup =
  | "routes"
  | "seo"
  | "a11y"
  | "images"
  | "fields"
  | "relationships"
  | "custom";

export type ScanFilters = {
  types?: string[];
  only?: CheckGroup[];
  skip?: CheckGroup[];
};
