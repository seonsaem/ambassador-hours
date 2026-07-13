import { auth } from './auth';
import { NextResponse } from 'next/server';
import prisma from './prisma';
import { Prisma } from '@prisma/client';
import { Session } from 'next-auth';

interface UserSelectFields {
  status: boolean;
  role?: boolean;
}

export interface DbUserResult {
  status: string;
  role?: string;
}

export type AuthResult =
  | { error: NextResponse; session: null; dbUser: null }
  | { error: null; session: Session; dbUser: DbUserResult };

export type AdminResult =
  | { error: NextResponse; session: null }
  | { error: null; session: Session };

async function validateUser(selectFields: UserSelectFields): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      session: null,
      dbUser: null,
    };
  }

  const dbUser = (await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: selectFields as Prisma.UserSelect,
  })) as DbUserResult | null;

  if (!dbUser || dbUser.status === 'BANNED') {
    return {
      error: NextResponse.json({ error: 'Account is suspended' }, { status: 403 }),
      session: null,
      dbUser: null,
    };
  }

  return { error: null, session, dbUser };
}

export async function requireAuth(): Promise<AuthResult> {
  return validateUser({ status: true, role: true });
}

export async function requireAdmin(): Promise<AdminResult> {
  const { error, session, dbUser } = await validateUser({ status: true, role: true });
  if (error) return { error, session: null };

  if (dbUser?.role !== 'ADMIN') {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      session: null,
    };
  }

  return { error: null, session };
}

