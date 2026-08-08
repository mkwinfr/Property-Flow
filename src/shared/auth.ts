export interface SessionUser {
  id: string;
  name: string;
  email: string;
  permissions: string[];
  propertyIds: string[];
  roles: string[];
}
