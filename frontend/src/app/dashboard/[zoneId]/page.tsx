"use client"

import { useParams, redirect } from "next/navigation"

export default function ZoneIndexRedirect() {
  const params = useParams<{ zoneId: string }>()
  const zoneId = params?.zoneId
  if (!zoneId) return null
  redirect(`/dashboard/${zoneId}/information`)
}


