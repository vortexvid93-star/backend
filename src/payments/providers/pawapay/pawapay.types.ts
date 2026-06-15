export type PawaPayInitiationStatus =
  | 'ACCEPTED'
  | 'REJECTED'
  | 'DUPLICATE_IGNORED';

export type PawaPayDepositStatus =
  | 'COMPLETED'
  | 'FAILED'
  | 'PROCESSING'
  | 'ACCEPTED';

export interface PawaPayFailureReason {
  failureCode?: string;
  failureMessage?: string;
}

export interface PawaPayDepositInitResponse {
  depositId: string;
  status: PawaPayInitiationStatus;
  created?: string;
  failureReason?: PawaPayFailureReason;
}

export interface PawaPayDepositCallback {
  depositId?: string;
  status?: string;
  clientReferenceId?: string;
  amount?: string;
  currency?: string;
  failureReason?: PawaPayFailureReason;
  payer?: {
    type?: string;
    accountDetails?: {
      phoneNumber?: string;
      provider?: string;
    };
  };
}

export interface PawaPayCheckDepositResponse {
  status: 'FOUND' | 'NOT_FOUND' | string;
  data?: PawaPayDepositCallback;
}
