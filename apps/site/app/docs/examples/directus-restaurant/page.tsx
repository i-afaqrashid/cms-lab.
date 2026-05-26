import type { Metadata } from "next";
import Link from "next/link";

import { CodeBlock, DocsShell } from "../../../components";

export const metadata: Metadata = {
  title: "Directus Restaurant Catalog Example",
  description:
    "Generic Directus restaurant catalog config for branches, menu items, categories, pricing, and inventory.",
};

const collections = [
  {
    name: "branches",
    use: "Physical locations",
    route: "/branches/:slug",
    fields: "name, slug, city, is_active",
  },
  {
    name: "menu_categories",
    use: "Menu grouping",
    route: "/categories/:slug",
    fields: "name, slug",
  },
  {
    name: "menu_items",
    use: "Dishes or products",
    route: "/menu/:branch/:slug when route data exists",
    fields: "name, slug, description, base_price, category_id",
  },
  {
    name: "item_branch_pricing",
    use: "Per-branch pricing and availability",
    route: "not directly routable",
    fields: "menu_item_id, branch_id, price, is_available",
  },
  {
    name: "inventory",
    use: "Stock per item and branch",
    route: "not directly routable",
    fields: "menu_item_id, branch_id, current_stock, low_stock_threshold",
  },
];

export default function DirectusRestaurantExamplePage() {
  return (
    <DocsShell
      active="/docs/examples"
      toc={[
        { href: "#shape", label: "Shape" },
        { href: "#config", label: "Config" },
        { href: "#fields", label: "Fields" },
        { href: "#images", label: "Images" },
        { href: "#limits", label: "Limits" },
      ]}
    >
      <div className="breadcrumb">Docs / Examples / Directus restaurant</div>
      <h1>Directus restaurant catalog example</h1>
      <p className="lede">
        This is a generic pattern for a restaurant or catalog CMS. It uses fake
        collection names and local URLs only. Route scans still need a running
        frontend; backend-only projects can start with config and agent context.
      </p>

      <h2 id="shape">Collection shape</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Collection</th>
            <th>Use</th>
            <th>Route</th>
            <th>Fields to check</th>
          </tr>
        </thead>
        <tbody>
          {collections.map((collection) => (
            <tr key={collection.name}>
              <td>
                <code>{collection.name}</code>
              </td>
              <td>{collection.use}</td>
              <td>{collection.route}</td>
              <td>{collection.fields}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 id="config">Config</h2>
      <p>
        Keep the Directus collections explicit. Only map routes when the
        frontend can actually render that document shape. If a branch-specific
        menu route needs a branch slug, make that slug available in the fetched
        item data or use a denormalized route field.
      </p>
      <p>
        A starter version of this shape is available from{" "}
        <code>cms-lab init --cms directus --router pages</code>.
      </p>
      <CodeBlock>{`import { defineConfig, readCmsDataPath } from "@cms-lab/core";

export default defineConfig({
  site: { url: "http://localhost:3000" },
  framework: { type: "next", router: "app" },
  cms: {
    provider: "directus",
    url: "http://localhost:8055",
    token: process.env.DIRECTUS_TOKEN,
    collections: [
      { type: "branch", collection: "branches", uidField: "slug" },
      { type: "category", collection: "menu_categories", uidField: "slug" },
      { type: "menu_item", collection: "menu_items", uidField: "slug", urlField: "routing.url" },
      { type: "pricing", collection: "item_branch_pricing", uidField: "id", routable: false },
      { type: "inventory", collection: "inventory", uidField: "id", routable: false },
    ],
  },
  routes: [
    { type: "branch", pattern: "/branches/:slug", getPath: (doc) => "/branches/" + doc.uid },
    {
      type: "menu_item",
      pattern: "/menu/:branch/:slug",
      getPath: (doc) => {
        if (doc.url) return doc.url;

        const branchSlug = readCmsDataPath(doc.data, "branch.slug");
        if (typeof branchSlug !== "string") {
          throw new Error("menu_item is missing branch.slug route data");
        }

        return "/menu/" + branchSlug + "/" + doc.uid;
      },
    },
  ],
});`}</CodeBlock>

      <h2 id="fields">Required fields</h2>
      <p>
        Required field checks are useful today for high-volume collections and
        junction collections. They do not prove the full relational invariant,
        but they catch missing values before templates or scripts assume them.
      </p>
      <CodeBlock>{`checks: {
  fields: {
    required: [
      { type: "branch", path: "name" },
      { type: "branch", path: "slug" },
      { type: "branch", path: "city", severity: "warning" },
      { type: "menu_item", path: "name" },
      { type: "menu_item", path: "slug" },
      { type: "menu_item", path: "description", severity: "warning" },
      { type: "menu_item", path: "base_price", severity: "warning" },
      { type: "pricing", path: "menu_item_id" },
      { type: "pricing", path: "branch_id" },
      { type: "pricing", path: "price" },
      { type: "inventory", path: "current_stock", severity: "warning" },
    ],
  },
}`}</CodeBlock>

      <h2 id="images">Images and alt text</h2>
      <p>
        If Directus stores images as file objects, cms-lab can use file
        descriptions as alt text. If a project stores only external image URLs,
        add a separate text field such as <code>image_alt</code> and require it.
      </p>
      <CodeBlock>{`checks: {
  fields: {
    required: [
      { type: "menu_item", path: "image_url", severity: "warning" },
      { type: "menu_item", path: "image_alt", severity: "warning" },
    ],
  },
}`}</CodeBlock>

      <h2 id="limits">What this catches today</h2>
      <ul>
        <li>Branch pages that return 404 or 500.</li>
        <li>Menu item route builders that cannot produce a valid path.</li>
        <li>Missing slugs, required fields, SEO fields, and image alt text.</li>
        <li>Junction rows missing required IDs or price fields.</li>
      </ul>
      <p>
        What is not built in yet: cross-document rules such as "every active
        menu item must have at least one available pricing row per branch" or
        "every branch must have one available menu item." Track those with the
        relationship-check feature work.
      </p>
      <p>
        Next steps:{" "}
        <Link href="/docs/providers/directus">Directus provider</Link>,{" "}
        <Link href="/docs/backend-only">backend-only workflow</Link>, and{" "}
        <Link href="/docs/large-catalogs">large catalog scanning</Link>.
      </p>
    </DocsShell>
  );
}
