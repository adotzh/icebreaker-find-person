type ChallengeCardProps = {
  fact: string
}

export function ChallengeCard({ fact }: ChallengeCardProps) {
  return (
    <section className="card mission-card" aria-live="polite">
      <div className="card-header">
        <p className="section-kicker">Step 2</p>
        <h2>Your mission</h2>
      </div>
      <p className="card-description">Find the guest behind this clue.</p>
      <p className="fact">{fact}</p>
      <p className="card-footnote">Talk to people, then submit your best guess below.</p>
    </section>
  )
}
