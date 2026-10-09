import { PageHeader } from "@/components/common";
import { EntityForm } from "@/components/entity-form";
export default function Page() { return <><PageHeader eyebrow="People" title="Add a person" description="Keep the little details close."/><EntityForm kind="people"/></>; }
