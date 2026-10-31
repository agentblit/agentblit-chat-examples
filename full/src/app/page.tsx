import { generateId } from "ai";
import { redirect } from "next/navigation";
import { EnvMissing } from "@/components/env-missing";
import { getConfig } from "@/lib/config";

export default function Page() {
  const { chatUrl, threadsUrl } = getConfig();
  if (!chatUrl || !threadsUrl) {
    return <EnvMissing />;
  }
  redirect(`/c/${generateId()}`);
}
