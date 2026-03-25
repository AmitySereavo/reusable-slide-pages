import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: "40px", fontFamily: "Arial, sans-serif" }}>
      <h1>Reusable Slide Pages</h1>
      <p>
        <Link href="/questionnaire/self-trust">Open self-trust questionnaire</Link>
      </p>
    </main>
  );
}