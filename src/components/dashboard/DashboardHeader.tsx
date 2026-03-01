import { FC } from 'react';
import { Bell, User, LogOut, Sun, Moon, FileSpreadsheet, RefreshCw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/components/auth/ThemeProvider';

interface DashboardHeaderProps {
  lastUpdate: Date;
  loading: boolean;
  userName: string;
  unreadNotifications: number;
  onRefresh: () => void;
  onExport: () => void;
  onNotificationsOpen: () => void;
  onSignOut: () => void;
}

const DashboardHeader: FC<DashboardHeaderProps> = ({
  lastUpdate,
  loading,
  userName,
  unreadNotifications,
  onRefresh,
  onExport,
  onNotificationsOpen,
  onSignOut,
}) => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="border-b bg-card">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Síntese Tracker</h1>
              <p className="text-sm text-muted-foreground">
                Rastreamento de Cargas
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={onNotificationsOpen}
                className="p-2 hover:bg-muted transition-colors"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground">
                    {unreadNotifications}
                  </Badge>
                )}
              </Button>
            </div>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-3 py-2">
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{userName}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
                  {userName}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? (
                    <Sun className="mr-2 h-4 w-4" />
                  ) : (
                    <Moon className="mr-2 h-4 w-4" />
                  )}
                  {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExport}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportar XLSX
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onRefresh} disabled={loading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar Dados
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
