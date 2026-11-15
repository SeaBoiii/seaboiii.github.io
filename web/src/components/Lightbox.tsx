"use client";

import NativeDialog from "./NativeDialog";

export default function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <NativeDialog open onClose={onClose} title="Artwork" className="artwork-dialog">
      <figure>
        {/* Originals are loaded only when the reader explicitly enlarges artwork. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} decoding="async" className="artwork-dialog-image" />
        <figcaption>{alt}</figcaption>
      </figure>
    </NativeDialog>
  );
}
