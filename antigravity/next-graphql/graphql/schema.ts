import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSchema } from "graphql-yoga";

export const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type User {
      id: ID!
      name: String
      email: String
    }

    type Query {
      users: [User!]!
      user(id: ID!): User
    }

    type Mutation {
      createUser(name: String!, email: String!): User!
    }
  `,
  resolvers: {
    Query: {
      users: async () => {
        return await db.select().from(users);
      },
      user: async (_: unknown, { id }: { id: string }) => {
        const result = await db
          .select()
          .from(users)
          .where(eq(users.id, Number(id)));
        return result[0] || null;
      },
    },
    Mutation: {
      createUser: async (
        _: unknown,
        { name, email }: { name: string; email: string }
      ) => {
        const result = await db
          .insert(users)
          .values({ name, email })
          .returning();
        return result[0];
      },
    },
  },
});
