import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="flex max-w-3xl flex-col items-center gap-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            FastKeep
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            QuickBooks-like accounting and financial management platform
          </p>
          <div className="flex gap-4">
            <Link href="/signup">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
