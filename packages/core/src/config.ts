import { loadConfig } from "c12";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ConfigLoadError } from "./errors.js";
import type { CmsLabConfig, RouteDefinition } from "./types.js";

const routeSchema = z
  .object({
    type: z.string().min(1),
    pattern: z.string().min(1),
    getPath: z.custom<RouteDefinition["getPath"]>(
      (value) => typeof value === "function",
      {
        message: "routes[].getPath must be a function",
      },
    ),
  })
  .strict();

const prismicConfigSchema = z
  .object({
    provider: z.literal("prismic"),
    repositoryName: z.string().min(1),
    accessToken: z.string().optional(),
    endpoint: z.string().url().optional(),
  })
  .strict();

const cmsFieldMappingShape = {
  uidField: z.string().min(1).optional(),
  urlField: z.string().min(1).optional(),
};

const strapiLocaleShape = {
  locale: z.string().min(1).optional(),
};

const strapiContentShape = z
  .object({
    type: z.string().min(1),
    endpoint: z.string().min(1),
    ...cmsFieldMappingShape,
    ...strapiLocaleShape,
  })
  .strict();

const strapiConfigSchema = z
  .object({
    provider: z.literal("strapi"),
    url: z.string().url(),
    token: z.string().optional(),
    ...strapiLocaleShape,
    collections: z.array(strapiContentShape).min(1).optional(),
    singleTypes: z.array(strapiContentShape).min(1).optional(),
  })
  .refine(
    (config) =>
      (config.collections?.length ?? 0) > 0 ||
      (config.singleTypes?.length ?? 0) > 0,
    {
      message: "Strapi config must include collections or singleTypes",
      path: ["collections"],
    },
  )
  .strict();

const directusConfigSchema = z
  .object({
    provider: z.literal("directus"),
    url: z.string().url(),
    token: z.string().optional(),
    collections: z
      .array(
        z
          .object({
            type: z.string().min(1),
            collection: z.string().min(1),
            ...cmsFieldMappingShape,
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const wordpressConfigSchema = z
  .object({
    provider: z.literal("wordpress"),
    url: z.string().url(),
    contentTypes: z
      .array(
        z
          .object({
            type: z.string().min(1),
            endpoint: z.string().min(1),
            ...cmsFieldMappingShape,
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

const contentfulConfigSchema = z
  .object({
    provider: z.literal("contentful"),
    spaceId: z.string().min(1),
    accessToken: z.string().min(1),
    environment: z.string().min(1).optional(),
    apiUrl: z.string().url().optional(),
    contentTypes: z
      .array(
        z
          .object({
            type: z.string().min(1),
            contentType: z.string().min(1),
            ...cmsFieldMappingShape,
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const sanityConfigSchema = z
  .object({
    provider: z.literal("sanity"),
    projectId: z.string().min(1),
    dataset: z.string().min(1),
    apiVersion: z.string().min(1).optional(),
    token: z.string().optional(),
    useCdn: z.boolean().optional(),
    perspective: z.enum(["published", "drafts", "raw"]).optional(),
    contentTypes: z
      .array(
        z
          .object({
            type: z.string().min(1),
            documentType: z.string().min(1),
            ...cmsFieldMappingShape,
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const cmsConfigSchema = z.discriminatedUnion("provider", [
  prismicConfigSchema,
  strapiConfigSchema,
  directusConfigSchema,
  wordpressConfigSchema,
  contentfulConfigSchema,
  sanityConfigSchema,
]);

const requiredFieldRuleSchema = z.object({
  type: z.string().min(1),
  path: z.string().min(1),
  severity: z.enum(["error", "warning"]).optional(),
});

const checksSchema = z
  .object({
    routes: z.boolean().optional(),
    seo: z
      .union([
        z.boolean(),
        z
          .object({
            metaTitle: z.boolean().optional(),
            metaDescription: z.boolean().optional(),
          })
          .strict(),
      ])
      .optional(),
    images: z.boolean().optional(),
    a11y: z
      .union([
        z.boolean(),
        z.object({ imgAlt: z.boolean().optional() }).strict(),
      ])
      .optional(),
    fields: z
      .union([
        z.boolean(),
        z.object({
          required: z.array(requiredFieldRuleSchema).optional(),
        }),
      ])
      .optional(),
  })
  .strict()
  .optional();

const configSchema = z
  .object({
    site: z
      .object({
        url: z.string().url(),
        healthPath: z
          .string()
          .min(1)
          .refine(
            (path) => path.startsWith("/") && !path.startsWith("//"),
            "healthPath must be a same-origin path starting with a single /",
          )
          .optional(),
        healthUrl: z.string().url().optional(),
      })
      .strict(),
    framework: z
      .object({
        type: z.literal("next"),
        router: z.enum(["app", "pages"]),
      })
      .strict(),
    cms: cmsConfigSchema,
    routes: z.array(routeSchema).min(1),
    checks: checksSchema,
  })
  .strict();

export type LoadedCmsLabConfig = {
  config: CmsLabConfig;
  configFile?: string;
};

export function defineConfig(config: CmsLabConfig): CmsLabConfig {
  return config;
}

export function validateConfig(input: unknown): CmsLabConfig {
  const result = configSchema.safeParse(input);

  if (!result.success) {
    throw new ConfigLoadError(z.prettifyError(result.error));
  }

  return result.data;
}

export async function loadCmsLabConfig(options: {
  cwd: string;
  configPath?: string;
}): Promise<LoadedCmsLabConfig> {
  try {
    const result = await loadConfig<CmsLabConfig>({
      name: "cms-lab",
      cwd: options.cwd,
      configFile: options.configPath,
      configFileRequired: true,
      dotenv: true,
      jitiOptions: {
        alias: {
          "@cms-lab/core": selfEntryPath(),
        },
      },
    });

    return {
      config: validateConfig(result.config),
      configFile: result.configFile,
    };
  } catch (error) {
    if (error instanceof ConfigLoadError) {
      throw error;
    }

    throw new ConfigLoadError(
      error instanceof Error ? error.message : "Failed to load cms-lab config",
    );
  }
}

function selfEntryPath(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const extension = currentFile.endsWith(".ts") ? "ts" : "js";
  return join(dirname(currentFile), `index.${extension}`);
}
