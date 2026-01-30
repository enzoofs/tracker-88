import { FC, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { sanitizeInput, sanitizeObject } from '@/lib/security';
import { 
  Bell, 
  X, 
  Package, 
  Plane, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: number;
  sales_order: string;
  cliente: string;
  tipo_notificacao: string;
  titulo: string;
  mensagem: string;
  data_evento: string;
  prioridade: 'alta' | 'normal' | 'baixa';
  status: 'pendente' | 'lida';
  detalhes?: any;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
  onCountUpdate: (count: number) => void;
}

const NotificationCenter: FC<NotificationCenterProps> = ({ 
  isOpen, 
  onClose, 
  unreadCount,
  onCountUpdate 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notification_queue')
        .select('*')
        .order('data_evento', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Transform and sanitize data to match our interface
      const transformedNotifications = data?.map(item => ({
        id: item.id,
        sales_order: sanitizeInput(item.sales_order || '', 50),
        cliente: sanitizeInput(item.cliente || '', 100),
        tipo_notificacao: sanitizeInput(item.tipo_notificacao || '', 50),
        titulo: sanitizeInput(item.titulo || '', 200),
        mensagem: sanitizeInput(item.mensagem || '', 500),
        data_evento: item.data_evento || '',
        prioridade: (item.prioridade === 'alta' || item.prioridade === 'normal' || item.prioridade === 'baixa' 
          ? item.prioridade : 'normal') as 'alta' | 'normal' | 'baixa',
        status: (item.status === 'pendente' || item.status === 'lida' 
          ? item.status : 'pendente') as 'pendente' | 'lida',
        detalhes: item.detalhes ? sanitizeObject(item.detalhes) : null
      })) || [];
      
      setNotifications(transformedNotifications);
      
      // Contar não lidas
      const unread = data?.filter(n => n.status === 'pendente').length || 0;
      onCountUpdate(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as notificações.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const markAsRead = async (notificationId: number) => {
    try {
      const { error } = await supabase
        .from('notification_queue')
        .update({ status: 'lida' })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, status: 'lida' as const } : n)
      );
      
      onCountUpdate(Math.max(0, unreadCount - 1));
      
      toast({
        title: "Notificação marcada como lida",
        description: "Notificação atualizada com sucesso."
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a notificação.",
        variant: "destructive"
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const pendingIds = notifications
        .filter(n => n.status === 'pendente')
        .map(n => n.id);

      if (pendingIds.length === 0) return;

      const { error } = await supabase
        .from('notification_queue')
        .update({ status: 'lida' })
        .in('id', pendingIds);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, status: 'lida' as const }))
      );
      
      onCountUpdate(0);
      
      toast({
        title: "Todas as notificações foram marcadas como lidas",
        description: `${pendingIds.length} notificações atualizadas.`
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar as notificações.",
        variant: "destructive"
      });
    }
  };

  const getNotificationIcon = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'pedido_enviado':
      case 'embarque':
        return <Package className="h-4 w-4 text-status-shipping" />;
      case 'chegada_armazem_miami':
      case 'chegada_brasil':
        return <Plane className="h-4 w-4 text-status-transit" />;
      case 'alerta_atraso':
      case 'temperatura_critica':
        return <AlertTriangle className="h-4 w-4 text-status-alert" />;
      case 'entrega_realizada':
        return <CheckCircle className="h-4 w-4 text-status-delivered" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'alta':
        return 'border-l-status-alert';
      case 'normal':
        return 'border-l-primary';
      case 'baixa':
        return 'border-l-muted-foreground';
      default:
        return 'border-l-border';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Agora há pouco';
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffHours < 48) return 'Ontem';
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-end p-4">
      <Card className="w-full max-w-md shadow-2xl mt-16 animate-slide-in-right">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-xs"
              >
                Marcar todas
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <ScrollArea className="h-96">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma notificação encontrada</p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-l-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                      getPriorityColor(notification.prioridade)
                    } ${notification.status === 'pendente' ? 'bg-primary/5' : ''}`}
                    onClick={() => {
                      if (notification.status === 'pendente') {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getNotificationIcon(notification.tipo_notificacao)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-sm font-medium ${
                            notification.status === 'pendente' ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {notification.titulo}
                          </h4>
                          {notification.status === 'pendente' && (
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.mensagem}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            SO: {notification.sales_order} • {notification.cliente}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDate(notification.data_evento)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationCenter;