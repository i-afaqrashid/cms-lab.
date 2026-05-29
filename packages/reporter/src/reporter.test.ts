import { renderHtmlReport } from "@cms-lab/reporter";
import type { ScanResult } from "@cms-lab/core";

test("renderHtmlReport escapes content and summarizes diagnostics", () => {
  const result: ScanResult = {
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "doc-1",
        type: "page",
        uid: "about",
        status: "published",
        data: {},
      },
    ],
    diagnostics: [
      {
        severity: "error",
        code: "CMS-ROUTE-500",
        message: "Route <script>alert(1)</script> returned 500",
        path: "/broken",
        source: "prismic:page#doc-1",
      },
    ],
    summary: { errors: 1, warnings: 0, info: 0 },
  };

  const html = renderHtmlReport(result);

  expect(html).toContain("<!doctype html>");
  expect(html).toContain('rel="icon"');
  expect(html).toContain('data-filter-kind="severity"');
  expect(html).toContain('data-filter-value="error"');
  expect(html).toContain('data-diagnostic data-group="routes"');
  expect(html).toContain("1 error");
  expect(html).toContain("1 document");
  expect(html).toContain("CMS-ROUTE-500");
  expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  expect(html).not.toContain("<script>alert(1)</script>");
});

test("renderHtmlReport pluralizes documents correctly", () => {
  const result: ScanResult = {
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: Array.from({ length: 6 }, (_, index) => ({
      id: `doc-${index}`,
      type: "page",
      uid: `page-${index}`,
      status: "published" as const,
      data: {},
    })),
    diagnostics: [],
    summary: { errors: 0, warnings: 0, info: 0 },
  };

  const html = renderHtmlReport(result);

  expect(html).toContain("6 documents");
  expect(html).not.toContain("documentss");
});

test("renderHtmlReport pluralizes info items correctly", () => {
  const result: ScanResult = {
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [],
    diagnostics: [
      {
        severity: "info",
        code: "CMS-ROUTE-UNMAPPED",
        message: "Settings has no public route",
      },
      {
        severity: "info",
        code: "CMS-ROUTE-UNMAPPED",
        message: "Navigation has no public route",
      },
    ],
    summary: { errors: 0, warnings: 0, info: 2 },
  };

  const html = renderHtmlReport(result);

  expect(html).toContain("2 info items");
  expect(html).not.toContain("2 infos");
});

test("renderHtmlReport keeps long CMS source IDs inside the diagnostic body", () => {
  const result: ScanResult = {
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [],
    diagnostics: [
      {
        severity: "error",
        code: "CMS-ROUTE-404",
        message: "Route /broken-article-route/perilous-yoga returned 404",
        path: "/broken-article-route/perilous-yoga",
        source: "prismic:article#YlcmaxMAACAAI0c0",
      },
    ],
    summary: { errors: 1, warnings: 0, info: 0 },
  };

  const html = renderHtmlReport(result);

  expect(html).toContain("overflow-wrap: anywhere");
  expect(html).toContain("word-break: break-word");
  expect(html).toContain("prismic:article#YlcmaxMAACAAI0c0");
  expect(html).not.toContain('class="src"');
});

test("renderHtmlReport can redact report details for sharing", () => {
  const result: ScanResult = {
    project: {
      framework: "next",
      router: "app",
      rootDir: "/Users/afaq/private-site",
      appDir: "/Users/afaq/private-site/app",
    },
    documents: [
      {
        id: "secret-document-id",
        type: "article",
        uid: "public-slug",
        status: "published",
        data: {},
      },
    ],
    diagnostics: [
      {
        severity: "error",
        code: "CMS-ROUTE-404",
        message:
          "Route /articles/public-slug returned 404 from /Users/afaq/private-site/app/articles/[uid]/page.tsx",
        path: "/articles/public-slug",
        source: "directus:articles#secret-document-id",
      },
      {
        severity: "warning",
        code: "CMS-FIELD-MISSING",
        message:
          "Document /Users/afaq/private-site/content.json is missing required field data.author.name",
        path: "data.author.name",
        source: "directus:articles#secret-document-id",
      },
    ],
    summary: { errors: 1, warnings: 1, info: 0 },
  };

  const html = renderHtmlReport(result, { privacy: "share" });

  expect(html).toContain("Share-safe report");
  expect(html).toContain("CMS-ROUTE-404");
  expect(html).toContain("CMS-FIELD-MISSING");
  expect(html).toContain("/articles/public-slug");
  expect(html).toContain("data.author.name");
  expect(html).toContain("[redacted project path]");
  expect(html).toContain("[redacted CMS source]");
  expect(html).not.toContain("/Users/afaq/private-site");
  expect(html).not.toContain("secret-document-id");
  expect(html).not.toContain("directus:articles#secret-document-id");
});

test("renderHtmlReport emits real filter chips for severity and diagnostic groups", () => {
  const result: ScanResult = {
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [],
    diagnostics: [
      {
        severity: "error",
        code: "CMS-ROUTE-404",
        message: "Route missing",
        path: "/missing",
      },
      {
        severity: "warning",
        code: "SEO-META-MISSING",
        message: "SEO missing",
      },
      {
        severity: "warning",
        code: "CMS-FIELD-MISSING",
        message: "Field missing",
        path: "data.title",
      },
      {
        severity: "warning",
        code: "CMS-RELATIONSHIP-MISSING",
        message: "Relationship missing",
        path: "relationships.menu_item.pricing",
      },
      {
        severity: "info",
        code: "CMS-ROUTE-UNMAPPED",
        message: "Settings has no route",
      },
    ],
    summary: { errors: 1, warnings: 3, info: 1 },
  };

  const html = renderHtmlReport(result);

  expect(html).toContain('data-filter-kind="all" data-filter-value="all"');
  expect(html).toContain(
    'data-filter-kind="severity" data-filter-value="error"',
  );
  expect(html).toContain(
    'data-filter-kind="severity" data-filter-value="warning"',
  );
  expect(html).toContain(
    'data-filter-kind="severity" data-filter-value="info"',
  );
  expect(html).toContain('data-filter-kind="group" data-filter-value="routes"');
  expect(html).toContain('data-filter-kind="group" data-filter-value="fields"');
  expect(html).toContain(
    'data-filter-kind="group" data-filter-value="relationships"',
  );
  expect(html).toContain('data-filter-kind="group" data-filter-value="seo"');
  expect(html).toContain('data-diagnostic data-group="routes"');
  expect(html).toContain('data-diagnostic data-group="fields"');
  expect(html).toContain('data-diagnostic data-group="relationships"');
  expect(html).toContain('data-diagnostic data-group="seo"');
});

test("renderHtmlReport shows repeated diagnostics by content type and template", () => {
  const result: ScanResult = {
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [],
    diagnostics: [
      {
        severity: "error",
        code: "CMS-ROUTE-404",
        message: "Route /about returned 404",
        path: "/about",
        source: "prismic:page#1",
      },
      {
        severity: "error",
        code: "CMS-ROUTE-404",
        message: "Route /contact returned 404",
        path: "/contact",
        source: "prismic:page#2",
      },
    ],
    diagnosticGroups: [
      {
        key: "error:CMS-ROUTE-404:page:/:uid",
        severity: "error",
        code: "CMS-ROUTE-404",
        count: 2,
        type: "page",
        routePattern: "/:uid",
        label: "page /:uid",
        examples: ["/about", "/contact"],
      },
    ],
    summary: { errors: 2, warnings: 0, info: 0 },
  };

  const html = renderHtmlReport(result);

  expect(html).toContain("Repeated findings");
  expect(html).toContain("page /:uid");
  expect(html).toContain("CMS-ROUTE-404");
  expect(html).toContain("/about, /contact");
});

test("renderHtmlReport summarizes collection and single-type documents when metadata is available", () => {
  const html = renderHtmlReport({
    project: {
      framework: "next",
      router: "pages",
      rootDir: "/site",
      pagesDir: "/site/pages",
    },
    documents: [
      {
        id: "page-1",
        type: "page",
        uid: "about",
        status: "published",
        entryKind: "collection",
        data: {},
      },
      {
        id: "navbar-1",
        type: "navbar",
        status: "published",
        routable: false,
        entryKind: "single",
        data: {},
      },
    ],
    diagnostics: [],
    summary: { errors: 0, warnings: 0, info: 0 },
  });

  expect(html).toContain("Collections");
  expect(html).toContain("Single types");
  expect(html).toContain("1 single type");
});

test("renderHtmlReport filter script hides non-matching diagnostics", () => {
  const html = renderHtmlReport({
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [],
    diagnostics: [
      {
        severity: "error",
        code: "CMS-ROUTE-404",
        message: "Route missing",
      },
      {
        severity: "warning",
        code: "SEO-META-MISSING",
        message: "SEO missing",
      },
      {
        severity: "info",
        code: "CMS-ROUTE-UNMAPPED",
        message: "Settings has no route",
      },
    ],
    summary: { errors: 1, warnings: 1, info: 1 },
  });
  const script = extractSingleScriptContent(html);
  expect(script).toBeTruthy();

  const reportDom = createFilterDom();
  new Function("document", script ?? "")(reportDom.document);

  reportDom.clickChip("severity", "error");
  expect(reportDom.visibleDiagnostics()).toEqual(["route-error"]);
  expect(reportDom.groupCounts()).toEqual({
    routes: "1 diagnostic",
    seo: "0 diagnostics",
  });

  reportDom.clickChip("group", "seo");
  expect(reportDom.visibleDiagnostics()).toEqual(["seo-warning"]);
  expect(reportDom.activeChip()).toBe("group:seo");

  reportDom.clickChip("all", "all");
  expect(reportDom.visibleDiagnostics()).toEqual([
    "route-error",
    "route-info",
    "seo-warning",
  ]);
});

test("renderHtmlReport groups custom-rule diagnostics under a custom group", () => {
  const result: ScanResult = {
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      { id: "doc-1", type: "menu_item", status: "published", data: {} },
    ],
    diagnostics: [
      {
        severity: "error",
        code: "CUSTOM-RULE",
        message: "Menu item price must be greater than 0",
        path: "data.price",
        source: "directus:menu_item#doc-1",
      },
    ],
    summary: { errors: 1, warnings: 0, info: 0 },
  };

  const html = renderHtmlReport(result);

  expect(html).toContain('data-diagnostic data-group="custom"');
  expect(html).toContain("CUSTOM-RULE");
  expect(html).toContain("Menu item price must be greater than 0");
});

function extractSingleScriptContent(html: string): string | undefined {
  const openingTag = "<script>";
  const closingTag = "</script>";
  const start = html.indexOf(openingTag);

  if (start === -1) {
    return undefined;
  }

  const contentStart = start + openingTag.length;
  const end = html.indexOf(closingTag, contentStart);

  if (end === -1) {
    return undefined;
  }

  return html.slice(contentStart, end).trim();
}

type TestElement = {
  classList: {
    toggle: (className: string, force: boolean) => void;
    contains: (className: string) => boolean;
  };
  dataset: Record<string, string>;
  textContent: string;
  addEventListener: (event: string, listener: () => void) => void;
  click: () => void;
  querySelector: (selector: string) => TestElement | null;
  querySelectorAll: (selector: string) => TestElement[];
};

function createFilterDom(): {
  document: { querySelectorAll: (selector: string) => TestElement[] };
  activeChip: () => string | undefined;
  clickChip: (kind: string, value: string) => void;
  groupCounts: () => Record<string, string>;
  visibleDiagnostics: () => string[];
} {
  const chips = [
    createElement({ filterKind: "all", filterValue: "all" }, "all:all"),
    createElement(
      { filterKind: "severity", filterValue: "error" },
      "severity:error",
    ),
    createElement(
      { filterKind: "severity", filterValue: "warning" },
      "severity:warning",
    ),
    createElement(
      { filterKind: "severity", filterValue: "info" },
      "severity:info",
    ),
    createElement(
      { filterKind: "group", filterValue: "routes" },
      "group:routes",
    ),
    createElement({ filterKind: "group", filterValue: "seo" }, "group:seo"),
  ];
  chips[0].classList.toggle("active", true);

  const routeGroup = createGroup("routes", [
    createElement({ group: "routes", severity: "error" }, "route-error"),
    createElement({ group: "routes", severity: "info" }, "route-info"),
  ]);
  const seoGroup = createGroup("seo", [
    createElement({ group: "seo", severity: "warning" }, "seo-warning"),
  ]);
  const groups = [routeGroup, seoGroup];

  return {
    document: {
      querySelectorAll(selector: string) {
        if (selector === "[data-filter-kind]") {
          return chips;
        }

        if (selector === "[data-diagnostic-group]") {
          return groups;
        }

        return [];
      },
    },
    activeChip: () =>
      chips.find((chip) => chip.classList.contains("active"))?.textContent,
    clickChip: (kind, value) => {
      const chip = chips.find(
        (candidate) =>
          candidate.dataset.filterKind === kind &&
          candidate.dataset.filterValue === value,
      );
      if (!chip) {
        throw new Error(`Missing test chip ${kind}:${value}`);
      }

      chip.click();
    },
    groupCounts: () =>
      Object.fromEntries(
        groups.map((group) => [
          group.dataset.diagnosticGroup,
          group.querySelector("[data-visible-count]")?.textContent ?? "",
        ]),
      ),
    visibleDiagnostics: () =>
      groups.flatMap((group) =>
        group
          .querySelectorAll("[data-diagnostic]")
          .filter((diagnostic) => !diagnostic.classList.contains("is-hidden"))
          .map((diagnostic) => diagnostic.textContent),
      ),
  };
}

function createGroup(label: string, diagnostics: TestElement[]): TestElement {
  const count = createElement({}, `${diagnostics.length} diagnostics`);
  const group = createElement({ diagnosticGroup: label }, label);
  group.querySelectorAll = (selector: string) =>
    selector === "[data-diagnostic]" ? diagnostics : [];
  group.querySelector = (selector: string) =>
    selector === "[data-visible-count]" ? count : null;
  return group;
}

function createElement(
  dataset: Record<string, string>,
  textContent: string,
): TestElement {
  const classes = new Set<string>();
  const listeners = new Map<string, () => void>();

  return {
    dataset,
    textContent,
    classList: {
      toggle(className: string, force: boolean) {
        if (force) {
          classes.add(className);
        } else {
          classes.delete(className);
        }
      },
      contains(className: string) {
        return classes.has(className);
      },
    },
    addEventListener(event: string, listener: () => void) {
      listeners.set(event, listener);
    },
    click() {
      listeners.get("click")?.();
    },
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}
