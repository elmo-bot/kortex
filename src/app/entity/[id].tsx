import { useLocalSearchParams } from 'expo-router';
import { EntityDetailScreen } from '@/features/entities/EntityDetailScreen';
export default function EntityRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <EntityDetailScreen id={id} />; }
