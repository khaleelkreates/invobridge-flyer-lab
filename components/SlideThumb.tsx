"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const DocumentLazy = dynamic(
  () => import("react-pdf").then((m) => m.Document),
  { ssr: false }
);
const PageLazy = dynamic(
  () => import("react-pdf").then((m) => m.Page),
  { ssr: false }
);

type Props = {
  file: string;
  pageNumber?: number;
  width?: number;
};

export default function SlideThumb({ file, pageNumber = 1, width = 400 }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const pdfjs = await import("react-pdf").then((m) => m.pdfjs);
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      await import("react-pdf/dist/Page/AnnotationLayer.css");
      await import("react-pdf/dist/Page/TextLayer.css");
      if (mounted) setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-800">
        <span className="text-xs text-slate-600">…</span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-slate-950">
      <DocumentLazy
        file={file}
        loading={
          <div className="flex h-full w-full items-center justify-center bg-slate-800">
            <span className="text-xs text-slate-600">…</span>
          </div>
        }
        error={
          <div className="flex h-full w-full items-center justify-center bg-slate-800">
            <span className="text-xs text-slate-600">preview unavailable</span>
          </div>
        }
      >
        <PageLazy
          pageNumber={pageNumber}
          width={width}
          renderAnnotationLayer={false}
          renderTextLayer={false}
        />
      </DocumentLazy>
    </div>
  );
}