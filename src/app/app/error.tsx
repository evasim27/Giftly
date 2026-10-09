"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) { return <Card className="mx-auto max-w-lg p-8 text-center sm:p-12"><p className="eyebrow mb-4 text-sage-700">A small interruption</p><h1 className="font-display text-4xl">Something went wrong.</h1><p className="mt-4 text-sm leading-7 text-stone-600">{error.message}</p><Button className="mt-7" onClick={reset}>Try again</Button></Card>; }
