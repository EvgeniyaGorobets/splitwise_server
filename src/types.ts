export type User = {
  id: number;
  username: string;
  transactions: Transaction[];
}

export type Transaction = {
  id: number;
  user_id: number;
	amount: number;
	timestamp: Date;
	vendor: string;
	description?: string;
	split_with: number;
}

export type AccountingJournal = {
  transaction: Transaction,
  type: TransactionType,
  balance: number,
}

enum TransactionType {
  CREDIT,
  DEBIT,
}