"use client";

import { use } from "react";
import PdfViewer from "@/components/PdfViewer";

export default function ContributionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return <PdfViewer id={id} />;
}