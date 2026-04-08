import Consulta1Form from '@/components/Consulta1Form';
import FichaPacientePage from '@/pages/FichaPacientePage';
import { useParams } from 'react-router-dom';

export default function PacientePage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'nova' || !id;

  if (isNew) {
    return <Consulta1Form />;
  }

  return <FichaPacientePage />;
}
