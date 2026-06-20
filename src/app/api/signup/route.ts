import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password } = body;

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'email, name, and password are required' },
        { status: 400 },
      );
    }

    // Password strength validation
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: '비밀번호는 8자 이상이어야 합니다.' },
        { status: 400 },
      );
    }

    // Find invited user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Not an invited email' },
        { status: 404 },
      );
    }

    if (user.status !== 'INVITED') {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user
    const updated = await prisma.user.update({
      where: { email },
      data: {
        name,
        password: hashedPassword,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      message: 'Signup successful',
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        status: updated.status,
      },
    });
  } catch (error) {
    console.error('POST /api/signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
