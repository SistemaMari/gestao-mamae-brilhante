import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import UsageWarningBanner from '@/components/UsageWarningBanner';
import { useProfissionalData } from '@/hooks/useProfissionalData';

export default function DashboardPage() {
  const { signOut } = useAuth();
  const { profissionalData } = useProfissionalData();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Banner de uso 90% */}
      {profissionalData && (
        <div className="pt-4">
          <UsageWarningBanner
            laudosUsados={profissionalData.laudos_usados}
            laudosLimite={profissionalData.laudos_limite}
          />
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Dashboard Clínico
          </h1>
          <p className="mt-2 text-muted-foreground">Em construção</p>
          {profissionalData && (
            <p className="mt-1 text-xs text-muted-foreground">
              Plano: <span className="font-medium text-foreground capitalize">{profissionalData.plano}</span>
              {' · '}
              Laudos: {profissionalData.laudos_usados}/{profissionalData.laudos_limite}
            </p>
          )}
          <Button variant="outline" className="mt-6" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
