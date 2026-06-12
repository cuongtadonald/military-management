import { notFound } from "next/navigation"
import { SoldierDetail } from "@/components/soldier-detail"
import { getSoldier } from "@/lib/soldiers"

export default async function SoldierPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const soldier = getSoldier(id)
  if (!soldier) notFound()
  return <SoldierDetail soldier={soldier} />
}
