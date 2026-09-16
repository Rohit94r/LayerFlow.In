import "./marketing.css";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link
        rel="preload"
        href="/fonts/satoshi-900.woff2"
        as="font"
        crossOrigin=""
        type="font/woff2"
      />
      <link
        rel="preload"
        href="/fonts/fraunces-italic-var.woff2"
        as="font"
        crossOrigin=""
        type="font/woff2"
      />
      <noscript>
        <style
          dangerouslySetInnerHTML={{
            __html: ".rv{opacity:1!important;transform:none!important}",
          }}
        />
      </noscript>
      {children}
    </>
  );
}