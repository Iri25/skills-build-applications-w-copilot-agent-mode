import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Suggestion = { title: string; reason: string; focus?: string };

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    getJson<{ suggestions: Suggestion[] }>('/api/workouts/suggestions/mona%40example.com')
      .then((data) => setSuggestions(data.suggestions))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Unavailable'))
      .finally(() => setLoading(false));
  }, []);
  return (
    <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns." loading={loading} error={error} empty={suggestions.length === 0} emptyText="No workout suggestions found">
      <ul>{suggestions.map((suggestion, index) => <li key={index}><strong>{suggestion.title}</strong>{suggestion.reason ? ` - ${suggestion.reason}` : ''}</li>)}</ul>
    </CapabilityCard>
  );
}
