import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, FileText, Bot, Gavel } from "lucide-react";

const ADMIN_SECTIONS = [
  {
    href: "/admin/content",
    label: "Content Queue",
    description: "Review and approve generated social content",
    icon: FileText,
  },
  {
    href: "/admin/agents",
    label: "Agent Management",
    description: "Configure debate agents and model tiers",
    icon: Bot,
  },
  {
    href: "/admin/resolution",
    label: "Resolution Queue",
    description: "Review prediction outcomes before publishing",
    icon: Gavel,
  },
];

export const metadata = {
  title: "Admin — Forecast Wars",
};

export default function AdminPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-violet-400" />
        <div>
          <h1 className="text-3xl font-bold">Founder Console</h1>
          <p className="text-white/50">
            Admin panel — heavy ops also available in macOS AgentOS
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ADMIN_SECTIONS.map(({ href, label, description, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="hover:border-violet-500/30 transition-colors h-full cursor-pointer">
              <CardHeader>
                <Icon className="h-5 w-5 text-violet-400 mb-2" />
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white/50">{description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
