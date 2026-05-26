import { strapiRelationSlug, strapiRelationValue } from "@cms-lab/core";

test("strapiRelationSlug reads Strapi relation slugs across v4 and flattened shapes", () => {
  expect(
    strapiRelationSlug(
      {
        topic: {
          data: {
            id: 1,
            attributes: {
              slug: "engineering",
            },
          },
        },
      },
      "topic",
    ),
  ).toBe("engineering");

  expect(
    strapiRelationSlug(
      {
        topic: {
          slug: "product",
        },
      },
      "topic",
    ),
  ).toBe("product");
});

test("strapiRelationValue reads a custom field from the first related entry", () => {
  expect(
    strapiRelationValue(
      {
        topics: {
          data: [
            {
              id: 1,
              attributes: { handle: "first-topic" },
            },
          ],
        },
      },
      "topics",
      "handle",
    ),
  ).toBe("first-topic");
});
