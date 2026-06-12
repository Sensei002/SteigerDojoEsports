import GameHub from '@/components/games/GameHub';

/**
 * Valorant hub.
 * Agent pick data is static sample content; wire up the Riot API where
 * indicated in `apiNote` for live stats.
 */
const Valorant = () => (
  <GameHub
    game="valorant"
    pickBanTitle="Agent Pick Rate"
    apiNote="Sample data — future Riot Games API integration."
    pickBanItems={[
      { name: 'Jett', rate: '72%' },
      { name: 'Raze', rate: '68%' },
      { name: 'Omen', rate: '61%' },
      { name: 'Sova', rate: '57%' },
      { name: 'Killjoy', rate: '54%' },
      { name: 'Sage', rate: '49%' },
      { name: 'Cypher', rate: '41%' },
    ]}
    hero={
      <p className="mt-3 max-w-xl text-sm text-white/80">
        Precise gunplay meets agent abilities. Follow agent picks, standings and
        rankings across SteigerDojo Valorant events.
      </p>
    }
  />
);

export default Valorant;
