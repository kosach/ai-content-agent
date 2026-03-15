export interface User {
  id: string;
  telegramId?: string;
  email?: string;
  name?: string;
  preferences?: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  defaultPlatforms?: string[];
  contentStyle?: string;
  tone?: string;
  language?: string;
  timezone?: string;
}
