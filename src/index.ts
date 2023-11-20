import { ApolloServer } from 'apollo-server';
import { TimestampTypeDefinition, TimestampResolver } from 'graphql-scalars';
import * as fs from 'fs';

import type { Transaction, User } from './types.ts';
import { Db } from './db.js';


const db = new Db();

const getAccountingJournal = async (user_id: string, friend_id: string): Promise<any> => {
  // TODO: fix weird type conversions
  const transactionHistory = await db.getTransactionHistory(Number(user_id), Number(friend_id));

  let balance = 0;
  const getJournalEntry = (transaction: Transaction) => {
    const transactionType = String(transaction.user_id) === user_id ? 'CREDIT' : 'DEBIT';
    const multiplier = String(transaction.user_id) === user_id ? 1 : -1;
    balance += transaction.amount * multiplier
    return {
      transaction,
      type: transactionType,
      balance
    };
  }

  const entries = transactionHistory.map(getJournalEntry)
  return { entries };
}

const resolvers = {
  Query: {
    user: async (parent, args) => (await db.getUserById(args.id)),
    accountingJournal: async(parent, args: {user: string, friend: string}) => (await getAccountingJournal(args.user, args.friend)),
  },
  Mutation: {
    createUser: async (parent, args: { username: string }) => (await db.createUser(args.username)),
    deleteUser: async (parent, args: { id: number }) => (await db.deleteUser(args.id)),
    // this is not technically true because there is no ID
    addTransaction: async (parent, args: { input: Transaction }) => (await db.addTransaction(args.input)),
    deleteTransaction: async (parent, args: { id: number }) => (await db.deleteTransaction(args.id))
  },
  Timestamp: TimestampResolver,
  User: {
    friends: async (parent: User, args) => (await db.getFriends(parent.id))
  }
}

// Define Apollo Server
const server = new ApolloServer({
  typeDefs: [TimestampTypeDefinition, fs.readFileSync('src/schema.graphql','utf8')],
  resolvers,
})

server
  .listen()
  .then(({ url }) =>
    console.log(`Server is running on ${url}`)
  );

// This is recommended by Apollo Server docs: https://www.apollographql.com/docs/apollo-server/getting-started
// Passing an ApolloServer instance to the `startStandaloneServer` function:
//  1. creates an Express app
//  2. installs your ApolloServer instance as middleware
//  3. prepares your app to handle incoming requests
//const { url } = await startStandaloneServer(server, {
//  listen: { port: 4000 },
//});