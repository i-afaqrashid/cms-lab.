export function readCmsDataPath(data: unknown, path: string): unknown {
  let current: unknown = data;

  for (const segment of path.split(".")) {
    if (!segment) {
      return undefined;
    }

    const record = asRecord(current);
    if (!record || !(segment in record)) {
      return undefined;
    }

    current = record[segment];
  }

  return current;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return undefined;
}
