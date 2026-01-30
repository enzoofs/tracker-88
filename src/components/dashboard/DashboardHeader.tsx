import React from 'react';
import { Globe, Bell, User, LogOut, Sun, Moon, FileSpreadsheet, RefreshCw, ChevronDown } from 'lucide-react';
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

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
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
    <div className="border-b border-border/50 bg-gradient-tech/5 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-tech shadow-tech">
              <Globe className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-tech text-foreground">Síntese Tracker</h1>
              <p className="text-muted-foreground font-medium">
                Rastreamento Inteligente de Cargas
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
                className="p-3 rounded-xl hover:bg-primary/10 transition-colors"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <Badge className="absolute -top-2 -right-2 px-2 py-1 text-xs bg-gradient-alert glow-accent">
                    {unreadNotifications}
                  </Badge>
                )}
              </Button>
            </div>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3 px-4 py-2 rounded-xl glass">
                  <div className="w-8 h-8 rounded-lg bg-gradient-tech flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-sm text-left">
                    <div className="font-tech text-foreground">{userName}</div>
                  </div>
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
