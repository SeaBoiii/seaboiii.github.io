import { responsiveImageSources } from "@/lib/images";

export default function ResponsiveImage({src, alt, className, sizes = "(max-width: 640px) 42vw, 240px", width = 640, height = 960, loading = "lazy", fetchPriority = "auto", decoding = "async"}: {
  src: string; alt: string; className?: string; sizes?: string; width?: number; height?: number;
  loading?: "lazy" | "eager"; fetchPriority?: "high" | "low" | "auto"; decoding?: "async" | "sync" | "auto";
}) {
  const sources = responsiveImageSources(src);
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...sources} alt={alt} className={className} sizes={sources.srcSet ? sizes : undefined} width={width} height={height} loading={loading} fetchPriority={fetchPriority} decoding={decoding} />;
}
