import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/guards';
import { Prisma } from '@prisma/client';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { error, session } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const userId = Number(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { status, role, name } = body;
    const dataToUpdate: Prisma.UserUpdateInput = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: '이름은 비어있을 수 없습니다.' },
          { status: 400 },
        );
      }
      dataToUpdate.name = name.trim();
    }

    if (status) {
      if (!['ACTIVE', 'BANNED'].includes(status)) {
        return NextResponse.json(
          { error: 'status must be ACTIVE or BANNED' },
          { status: 400 },
        );
      }
      dataToUpdate.status = status;
    }

    if (role) {
      if (!['ADMIN', 'USER'].includes(role)) {
        return NextResponse.json(
          { error: 'role must be ADMIN or USER' },
          { status: 400 },
        );
      }
      
      // Prevent an admin from downgrading themselves
      if (role === 'USER' && user.id === Number(session!.user.id)) {
        return NextResponse.json(
          { error: 'You cannot downgrade your own role' },
          { status: 400 },
        );
      }
      dataToUpdate.role = role;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json(
        { error: 'No data to update' },
        { status: 400 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/users/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { error, session } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const userId = Number(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }

    // Prevent an admin from deleting themselves
    if (user.id === Number(session!.user.id)) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 },
      );
    }

    // Use a transaction to delete all activity requests first (due to foreign key), then delete the user
    await prisma.$transaction([
      prisma.fileStore.updateMany({
        where: { uploadedById: user.id },
        data: { uploadedById: null },
      }),
      prisma.activityRequest.deleteMany({
        where: { userId: user.id },
      }),
      prisma.user.delete({
        where: { id: user.id },
      }),
    ]);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/users/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
