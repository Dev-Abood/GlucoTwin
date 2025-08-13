"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Bell, Archive, Inbox, ArchiveX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Notification } from './notification-types';
import { formatTimestamp, getNotificationIcon, getNotificationIconColor } from './notification-utils';
import { mockPatientNotifications, mockDoctorNotifications } from './mock-data';

interface NotificationPanelProps {
  userType: 'patient' | 'doctor';
}

export default function NotificationPanel({ userType }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<'inbox' | 'archive'>('inbox');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load mock data based on user type
    const mockData = userType === 'patient' ? mockPatientNotifications : mockDoctorNotifications;
    setNotifications(mockData);
  }, [userType]);

  const inboxNotifications = notifications.filter(n => !n.isArchived);
  const archivedNotifications = notifications.filter(n => n.isArchived);
  const unreadCount = inboxNotifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  const handleArchive = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isArchived: true, isRead: true } : n)
    );
  };

  const handleArchiveAll = () => {
    setNotifications(prev => 
      prev.map(n => !n.isArchived ? { ...n, isArchived: true, isRead: true } : n)
    );
  };

  const currentNotifications = activeTab === 'inbox' ? inboxNotifications : archivedNotifications;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-blue-600 hover:bg-blue-700"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-96 p-0 bg-white border border-gray-200 shadow-lg"
        sideOffset={8}
      >
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {activeTab === 'inbox' && inboxNotifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleArchiveAll}
                className="text-xs text-gray-500 hover:text-gray-700 h-auto p-1"
              >
                Archive all
              </Button>
            )}
          </div>
          <div className="flex space-x-1">
            <Button
              variant={activeTab === 'inbox' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('inbox')}
              className={cn(
                "flex items-center gap-2 text-xs h-8",
                activeTab === 'inbox' 
                  ? "bg-gray-900 text-white hover:bg-gray-800" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              <Inbox className="h-3 w-3" />
              Inbox
              {unreadCount > 0 && (
                <Badge variant="secondary" className="h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs bg-blue-100 text-blue-700">
                  {unreadCount}
                </Badge>
              )}
            </Button>
            <Button
              variant={activeTab === 'archive' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('archive')}
              className={cn(
                "flex items-center gap-2 text-xs h-8",
                activeTab === 'archive' 
                  ? "bg-gray-900 text-white hover:bg-gray-800" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              <Archive className="h-3 w-3" />
              Archive
            </Button>
          </div>
        </div>

        <ScrollArea className="h-96">
          {currentNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="mb-2">
                {activeTab === 'inbox' ? (
                  <Inbox className="h-8 w-8 mx-auto text-gray-300" />
                ) : (
                  <Archive className="h-8 w-8 mx-auto text-gray-300" />
                )}
              </div>
              <p className="text-sm">
                {activeTab === 'inbox' ? 'No new notifications' : 'No archived notifications'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {currentNotifications.map((notification, index) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-gray-50 cursor-pointer transition-colors",
                    !notification.isRead && "bg-blue-50/50"
                  )}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm",
                      getNotificationIconColor(notification.type)
                    )}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </p>
                        <div className="flex items-center gap-2 ml-2">
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                          )}
                          {activeTab === 'inbox' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchive(notification.id);
                              }}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                            >
                              <ArchiveX className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
