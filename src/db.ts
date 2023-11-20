import pg from 'pg';

import type { User, Transaction } from './types';


export class Db {
  client: pg.Client

  constructor() {
    this.setUpClient();
  }

  private async query(query: pg.QueryConfig): Promise<any> {
    try {
      console.log("Executing query", { ...query })
      return (await this.client.query(query));
    } catch (e) {
      console.error(e);
      // return null?
    }
  }

  async setUpClient(): Promise<pg.Client> {
    const client = new pg.Client({database: 'splitwise'});
    await client.connect();
    this.client = client;
    console.log('Done connecting to splitwise db!')
  }

  async closeConnection() {
    await this.client.end()
  }

  async createUser(username: string): Promise<User> {
    const result = await this.query(`
      INSERT INTO users (username)
        VALUES ('${username}')
        RETURNING *;
    `)
    // TODO: handle error case
    return result.rows[0] as User;
  }

  async deleteUser(id: number): Promise<User> {
    const result = await this.query({
      name: 'delete-user',
      text: `
        DELETE FROM users
        WHERE id = $1::int
        RETURNING *;
      `,
      values: [id]
    });
    return result.rows[0] as User;
  }

  async getUserById(id: number): Promise<User> {
    const result = await this.query({
      name: 'get-user-by-id',
      text: `
        SELECT *
        FROM users
        WHERE id = $1::int;
      `,
      values: [id],
    });
    // TODO: handle error case
    return result.rows[0] as User;
  }

  async getFriends(user_id: number): Promise<User[]> {
    const result = await this.query({
      name: 'get-user-fiends',
      text: `
        WITH user_transactions AS (
          SELECT *
          FROM transactions
          WHERE user_id = $1::int OR split_with = $1::int
        )
        SELECT DISTINCT u.id, u.username
        FROM user_transactions t JOIN users u
        ON (t.user_id = u.id OR t.split_with = u.id)
        WHERE u.id <> $1::int;
      `,
      values: [user_id],
    });
    // TODO: handle error case
    return result.rows as User[];
  }

  async addTransaction(transaction: Transaction): Promise<Transaction> {
    const {
      user_id,
      amount,
      timestamp,
      vendor,
      description,
      split_with
    } = transaction;
    // get date and timezone
    // should i convert null descriptions to strings?
    
    const result = await this.query({
      name: 'add-transaction',
      text: `
      INSERT INTO transactions (user_id, amount, timestamp, vendor, description, split_with)
        VALUES ($1::int, $2::int, $3::timestamp, $4::text, $5::text, $6::int)
        RETURNING *;
      `,
      values: [user_id, amount, timestamp, vendor, description ?? '', split_with]
    });
    // TODO: handle error case
    return result.rows[0] as Transaction;
  }

  async deleteTransaction(id: number): Promise<Transaction> {
    const result = await this.query({
      name: 'delete-transaction',
      text: `
        DELETE FROM transactions
        WHERE id = $1::int
        RETURNING *;
      `,
      values: [id]
    });
    return result.rows[0] as Transaction;
  }

  async getTransactionsByUser(user_id: number): Promise<Transaction[]> {
    const result = await this.query({
      name: 'get-transactions-by-user',
      text: `
        SELECT *
        FROM transactions
        WHERE user_id = $1::int;
      `,
      values: [user_id]
    });
    return result.rows as Transaction[];
  }

  async getTransactionHistory(user_id: number, friend_id: number): Promise<Transaction[]> {
    // TODO: check your definition of debit and credit
    const result = await this.query({
      name: `get-transaction-history`,
      text: `
      SELECT *
      FROM transactions
      WHERE (user_id = $1::int AND split_with = $2::int)
        OR (user_id = $2::int AND split_with = $1::int)
      ORDER BY timestamp;
      `,
      values: [user_id, friend_id]
    })
    return result.rows;
  }
  
}

// TODO consider swapping out int PKs for UUIDs
// https://stackoverflow.com/questions/33274291/uuid-or-sequence-for-primary-key

// consider using prisma
// https://www.prisma.io/apollo
