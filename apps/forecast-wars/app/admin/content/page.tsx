import { ContentAdminPanel } from "@/components/admin/ContentAdminPanel";

export const metadata = {
  title: "Content Approval — Admin",
};

export default function ContentAdminPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Content Approval Queue</h1>
        <p className="text-white/50">Manual approval only — no auto-posting</p>
      </div>
      <ContentAdminPanel />
    </div>
  );
}
