export type ServiceStatus = 'UP' | 'DOWN' | 'WARNING';
export type ServiceCategory = 'Core' | 'Integration' | 'Infrastructure' | 'Data';

export interface ServiceItem {
  id: string;
  name: string;
  version: string;
  status: ServiceStatus;
  lastHeartbeat: string;
  type: ServiceCategory;
}

export interface LogEntry {
  id: string;
  serviceId: string;
  timestamp: string;
  message: string;
  level: 'INFO' | 'WARN' | 'ERROR';
}

export interface ActivityItem extends LogEntry {
  serviceName: string;
}
