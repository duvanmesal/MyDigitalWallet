export type IdentificationType = 'CC' | 'TI' | 'CE' | 'PAS';

export interface ClientAccount {
  uid: string;
  firstName: string;
  familyName: string;
  documentCategory: IdentificationType;
  documentId: string;
  country: string;
  emailAddress: string;
  creationTimestamp: number;
  biometryActivated?: boolean;
  deviceToken?: string;
}
