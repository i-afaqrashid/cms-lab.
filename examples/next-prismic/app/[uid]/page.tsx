type PageProps = {
  params: Promise<{ uid: string }>;
};

export default async function CmsPage({ params }: PageProps) {
  const { uid } = await params;

  return <main>CMS page: {uid}</main>;
}
