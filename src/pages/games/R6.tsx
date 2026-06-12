import GameHub from '@/components/games/GameHub';

/**
 * Rainbow Six Siege hub.
 * Operator ban data is static sample content; wire up the Ubisoft / R6 match
 * API where indicated in `apiNote` for live stats.
 */
const R6 = () => (
  <GameHub
    game="r6"
    pickBanTitle="Operator Ban Rate"
    apiNote="Sample data — future Ubisoft Stats / R6 Match Data API integration."
    pickBanItems={[
      { name: 'Thatcher', rate: '94%' },
      { name: 'Thermite', rate: '88%' },
      { name: 'Jäger', rate: '85%' },
      { name: 'Bandit', rate: '79%' },
      { name: 'Mute', rate: '71%' },
      { name: 'Smoke', rate: '64%' },
      { name: 'Ace', rate: '58%' },
    ]}
    hero={
      <p className="mt-3 max-w-xl text-sm text-white/80">
        Tactical 5v5 competition. Track operator bans, standings and team rankings
        across SteigerDojo R6 events.
      </p>
    }
  />
);

export default R6;
