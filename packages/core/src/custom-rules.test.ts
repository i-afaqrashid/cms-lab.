import {
  durationMs,
  evaluateCustomRules,
  satisfiesAssertion,
  type CMSDocument,
  type CmsLabConfig,
  type CustomRule,
} from "@cms-lab/core";

const NOW = Date.parse("2026-05-29T00:00:00.000Z");

function makeConfig(custom: CustomRule[]): CmsLabConfig {
  return {
    site: { url: "http://localhost:3000" },
    framework: { type: "next", router: "app" },
    cms: {
      provider: "directus",
      url: "http://localhost:8055",
      collections: [],
    },
    routes: [
      {
        type: "menu_item",
        pattern: "/menu/:uid",
        getPath: (doc) => `/menu/${doc.uid}`,
      },
    ],
    checks: { custom },
  };
}

function doc(
  type: string,
  id: string,
  data: Record<string, unknown>,
): CMSDocument {
  return { id, type, status: "published", data };
}

test("declarative numeric rule flags values that fail the bound", () => {
  const diagnostics = evaluateCustomRules(
    makeConfig([
      {
        code: "MENU-PRICE",
        type: "menu_item",
        path: "price",
        assert: { gt: 0 },
        message: "Menu item price must be greater than 0",
      },
    ]),
    [
      doc("menu_item", "ok", { price: 12 }),
      doc("menu_item", "free", { price: 0 }),
      doc("menu_item", "missing", {}),
      doc("page", "ignored", { price: -5 }),
    ],
    { now: NOW },
  );

  expect(diagnostics).toEqual([
    {
      severity: "error",
      code: "MENU-PRICE",
      message: "Menu item price must be greater than 0",
      path: "data.price",
      source: "directus:menu_item#free",
    },
    {
      severity: "error",
      code: "MENU-PRICE",
      message: "Menu item price must be greater than 0",
      path: "data.price",
      source: "directus:menu_item#missing",
    },
  ]);
});

test("filter narrows a declarative rule to matching documents", () => {
  const diagnostics = evaluateCustomRules(
    makeConfig([
      {
        type: "page",
        filter: { template: "legal" },
        path: "last_reviewed_at",
        assert: { newerThan: "12months" },
        severity: "warning",
        code: "LEGAL-REVIEW-OVERDUE",
      },
    ]),
    [
      doc("page", "stale-legal", {
        template: "legal",
        last_reviewed_at: "2024-01-01T00:00:00.000Z",
      }),
      doc("page", "fresh-legal", {
        template: "legal",
        last_reviewed_at: "2026-05-01T00:00:00.000Z",
      }),
      doc("page", "marketing", {
        template: "marketing",
        last_reviewed_at: "2000-01-01T00:00:00.000Z",
      }),
    ],
    { now: NOW },
  );

  expect(diagnostics.map((d) => d.source)).toEqual([
    "directus:page#stale-legal",
  ]);
  expect(diagnostics[0]).toMatchObject({
    severity: "warning",
    code: "LEGAL-REVIEW-OVERDUE",
    path: "data.last_reviewed_at",
  });
});

test("notMatches catches placeholder image descriptions", () => {
  const diagnostics = evaluateCustomRules(
    makeConfig([
      {
        type: "menu_item",
        path: "image.description",
        assert: { notMatches: "^(image|photo|todo)$" },
        code: "IMG-DESC-PLACEHOLDER",
      },
    ]),
    [
      doc("menu_item", "good", { image: { description: "Grilled salmon" } }),
      doc("menu_item", "bad", { image: { description: "image" } }),
    ],
    { now: NOW },
  );

  expect(diagnostics.map((d) => d.source)).toEqual(["directus:menu_item#bad"]);
});

test("string shorthand assertions normalize correctly", () => {
  const diagnostics = evaluateCustomRules(
    makeConfig([{ type: "event", path: "eventDate", assert: "futureDate" }]),
    [
      doc("event", "upcoming", { eventDate: "2026-12-31T00:00:00.000Z" }),
      doc("event", "passed", { eventDate: "2020-01-01T00:00:00.000Z" }),
    ],
    { now: NOW },
  );

  expect(diagnostics).toHaveLength(1);
  expect(diagnostics[0].source).toBe("directus:event#passed");
});

test("functional rule emits diagnostics through the context helpers", () => {
  const rule: CustomRule = (document, ctx) => {
    if (document.type !== "branch") {
      return;
    }
    const items = ctx.readPath("available_items");
    if (!Array.isArray(items) || items.length === 0) {
      ctx.error(
        "BRANCH-NO-ITEMS",
        `Branch ${document.id} has no available items`,
        {
          path: "data.available_items",
        },
      );
    }
  };

  const diagnostics = evaluateCustomRules(
    makeConfig([rule]),
    [
      doc("branch", "downtown", { available_items: [{ id: 1 }] }),
      doc("branch", "airport", { available_items: [] }),
      doc("menu_item", "skipme", {}),
    ],
    { now: NOW },
  );

  expect(diagnostics).toEqual([
    {
      severity: "error",
      code: "BRANCH-NO-ITEMS",
      message: "Branch airport has no available items",
      path: "data.available_items",
      source: "directus:branch#airport",
    },
  ]);
});

test("no custom rules produces no diagnostics", () => {
  expect(evaluateCustomRules(makeConfig([]), [doc("page", "a", {})])).toEqual(
    [],
  );
});

test("satisfiesAssertion enforces each constraint", () => {
  expect(satisfiesAssertion(5, { gt: 0, lt: 10 }, NOW)).toBe(true);
  expect(satisfiesAssertion(15, { gt: 0, lt: 10 }, NOW)).toBe(false);
  expect(
    satisfiesAssertion("draft", { oneOf: ["draft", "published"] }, NOW),
  ).toBe(true);
  expect(
    satisfiesAssertion("archived", { oneOf: ["draft", "published"] }, NOW),
  ).toBe(false);
  expect(satisfiesAssertion(["a", "b"], { minLength: 2 }, NOW)).toBe(true);
  expect(satisfiesAssertion(["a"], { minLength: 2 }, NOW)).toBe(false);
  expect(satisfiesAssertion("hello", { matches: "^h" }, NOW)).toBe(true);
  expect(satisfiesAssertion(undefined, "present", NOW)).toBe(false);
  expect(satisfiesAssertion("x", "present", NOW)).toBe(true);
});

test("durationMs parses relative windows", () => {
  expect(durationMs("30d")).toBe(30 * 86_400_000);
  expect(durationMs("12months")).toBe(12 * 2_592_000_000);
  expect(durationMs("2 weeks")).toBe(2 * 604_800_000);
  expect(durationMs("1y")).toBe(31_536_000_000);
  expect(durationMs("nonsense")).toBe(0);
});
