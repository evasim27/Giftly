import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() { return <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5 text-center"><p className="eyebrow mb-5 text-sage-700">A missing page</p><h1 className="font-display text-5xl leading-none sm:text-6xl">This page is unavailable.</h1><p className="mt-5 max-w-sm text-sm leading-7 text-stone-600">The item or shared link may have been removed.</p><Button asChild className="mt-8"><Link href="/">Go to Giftly</Link></Button></main>; }
