import { auth } from './auth';
import { NextResponse } from 'next/server';
import prisma from './prisma';
import { Prisma } from '@prisma/client';

interface UserSelectFields {
  status: boolean;
  role?: boolean;
}

interface DbUserResult {
  status: string;
  role?: string;
}

async function validateUser(selectFields: UserSelectFields) {
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

export async function requireAuth() {
  const { error, session, dbUser } = await validateUser({ status: true, role: true });
  return { error, session, dbUser };
}

export async function requireAdmin() {
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
