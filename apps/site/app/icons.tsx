import {
  Fingerprint,
  Image as ImageIcon,
  ListChecks,
  Route,
  SearchCheck,
  TerminalSquare,
  type LucideIcon,
} from "lucide-react";
import type { IconType } from "react-icons";
import {
  SiContentful,
  SiDirectus,
  SiPrismic,
  SiSanity,
  SiStrapi,
  SiWordpress,
} from "react-icons/si";

type IconName = "routes" | "fields" | "seo" | "images" | "uid" | "ci";
type CmsLogoName =
  | "prismic"
  | "strapi"
  | "directus"
  | "wordpress"
  | "contentful"
  | "sanity";

const featureIcons = {
  routes: Route,
  fields: ListChecks,
  seo: SearchCheck,
  images: ImageIcon,
  uid: Fingerprint,
  ci: TerminalSquare,
} satisfies Record<IconName, LucideIcon>;

const cmsLogos = {
  prismic: SiPrismic,
  strapi: SiStrapi,
  directus: SiDirectus,
  wordpress: SiWordpress,
  contentful: SiContentful,
  sanity: SiSanity,
} satisfies Record<CmsLogoName, IconType>;

export function FeatureIcon({ name }: { name: IconName }) {
  const Icon = featureIcons[name];

  return (
    <Icon
      aria-hidden="true"
      className="iconSvg"
      focusable="false"
      strokeWidth={1.8}
    />
  );
}

export function CmsLogo({ name }: { name: CmsLogoName }) {
  const Logo = cmsLogos[name];

  return <Logo aria-hidden="true" className="cmsLogoSvg" focusable="false" />;
}
