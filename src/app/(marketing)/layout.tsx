import { PublicFooter, PublicHeader } from "@/components/marketing/public-shell";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      {children}
      <PublicFooter />
    </div>
  );
}
