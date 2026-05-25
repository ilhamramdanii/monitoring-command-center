export type ServiceStatus = 'UP' | 'DOWN' | 'WARNING';
export type ServiceCategory = 'Core' | 'Integration' | 'Infrastructure' | 'Data';

export interface ServiceItemDto {
  id: string;
  name: string;
  version: string;
  status: ServiceStatus;
  lastHeartbeat: string;
  type: ServiceCategory;
}

export interface LogEntryDto {
  id: string;
  serviceId: string;
  timestamp: string;
  message: string;
  level: 'INFO' | 'WARN' | 'ERROR';
}

export interface ActivityItemDto extends LogEntryDto {
  serviceName: string;
}
