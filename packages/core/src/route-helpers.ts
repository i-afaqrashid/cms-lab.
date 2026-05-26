import { readCmsDataPath } from "./data-path.js";

export function strapiRelationSlug(
  data: unknown,
  path: string,
): string | undefined {
  return strapiRelationValue(data, path, "slug");
}

export function strapiRelationValue(
  data: unknown,
  path: string,
  field: string,
): string | undefined {
  const relation = unwrapStrapiRelation(readCmsDataPath(data, path));
  const value = readCmsDataPath(relation, field);

  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function unwrapStrapiRelation(value: unknown): unknown {
  const record = asRecord(value);
  if (record && "data" in record) {
    return unwrapStrapiRelation(record.data);
  }

  if (Array.isArray(value)) {
    return unwrapStrapiRelation(value[0]);
  }

  if (record && "attributes" in record) {
    const attributes = asRecord(record.attributes);
    return attributes ? { id: record.id, ...attributes } : record;
  }

  return value;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return undefined;
}
