type ChallengeCardProps = {
  fact: string
}

export function ChallengeCard({ fact }: ChallengeCardProps) {
  return (
    <section className="card">
      <h2>Your mission</h2>
      <p className="fact">{fact}</p>
      <p>Find the person this fact belongs to, then submit their name.</p>
    </section>
  )
}
