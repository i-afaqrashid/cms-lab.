export class CmsLabError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "CmsLabError";
  }
}

export class ConfigLoadError extends CmsLabError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR");
    this.name = "ConfigLoadError";
  }
}

export class CmsFetchError extends CmsLabError {
  constructor(message: string) {
    super(message, "CMS_UNREACHABLE");
    this.name = "CmsFetchError";
  }
}

export class SiteUnreachableError extends CmsLabError {
  constructor(message: string) {
    super(message, "SITE_UNREACHABLE");
    this.name = "SiteUnreachableError";
  }
}
