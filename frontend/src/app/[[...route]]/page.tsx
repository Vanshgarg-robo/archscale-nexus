import { AppShell } from "@/components/app-shell";

export default async function Page({ params }: { params: Promise<{ route?: string[] }> }) {
  const { route = [] } = await params;
  return <AppShell route={`/${route.join("/")}`} />;
}
