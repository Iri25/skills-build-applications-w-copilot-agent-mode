import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Team = { name: string; mascot?: string; members: string[] };

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    getJson<{ teams: Team[] }>('/api/teams')
      .then((data) => setTeams(data.teams))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Unavailable'))
      .finally(() => setLoading(false));
  }, []);
  return (
    <CapabilityCard title="Teams" description="Manage teams and members." loading={loading} error={error} empty={teams.length === 0} emptyText="No teams found">
      <ul>{teams.map((team, index) => <li key={index}>{team.name}{team.mascot ? ` - ${team.mascot}` : ''}{team.members?.length ? ` (${team.members.join(', ')})` : ''}</li>)}</ul>
    </CapabilityCard>
  );
}
