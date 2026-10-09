import { PageHeader } from "@/components/common";
import { EntityForm } from "@/components/entity-form";
import { getAssignmentOptions } from "@/lib/options";
export default async function Page({ searchParams }: { searchParams: Promise<{ person_id?: string; event_id?: string }> }) { const preset = await searchParams; const { people, events } = await getAssignmentOptions(); return <><PageHeader eyebrow="Gifts" title="Add a gift" description="Save the idea now. Fill in the details as you go."/><EntityForm kind="gifts" people={people} events={events} preset={preset}/></>; }
