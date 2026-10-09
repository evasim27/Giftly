import { AuthForm } from "@/components/auth-form";
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) { const { next, error } = await searchParams; return <AuthForm mode="login" next={next} error={error}/>; }
