import { PageHeader } from "@/components/common";
import { EntityForm } from "@/components/entity-form";
export default function Page() { return <><PageHeader eyebrow="Events" title="Add an event" description="Plan a special day, your way."/><EntityForm kind="events"/></>; }
