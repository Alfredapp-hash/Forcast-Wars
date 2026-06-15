import { ResolutionAdminPanel } from "@/components/admin/ResolutionAdminPanel";

export const metadata = {
  title: "Resolution Queue — Admin",
};

export default function ResolutionAdminPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Resolution Queue</h1>
        <p className="text-white/50">Human review required for all outcomes</p>
      </div>
      <ResolutionAdminPanel />
    </div>
  );
}
