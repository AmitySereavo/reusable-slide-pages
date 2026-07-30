import ActivityTrackingProvider from "@/components/activity/ActivityTrackingProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <ActivityTrackingProvider>{children}</ActivityTrackingProvider>
      </body>
    </html>
  );
}
